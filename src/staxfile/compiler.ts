import path from 'path'
import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { exit, fileExists } from '~/utils'

export default class Compiler {
  public staxfile: string
  private data: any

  constructor(staxfile: string) {
    this.staxfile = staxfile
  }

  get baseDir(): string {
    return path.dirname(path.resolve(this.staxfile))
  }

  public compile() {
    this.data = load(readFileSync(this.staxfile, 'utf-8'))
    const cwd = process.cwd()

    try {
      process.chdir(this.baseDir)
      this.createDockerfile()
    } finally {
      process.chdir(cwd)
    }
  }

  private createDockerfile() {
    const modules = this.loadModules()
    const base = this.parseBase(this.data.build.base, modules)
    console.log(base)
  }

  private loadModules(): Record<string, string> {
    if (!this.data.build.modules)
      return {}

    const dir = path.resolve(path.dirname(this.data.build.base))
    const modules: Record<string, string> = {}
    this.data.build.modules.forEach(item => this.parseModuleFile(`${dir}/${item}`, modules))
    return modules
  }

  private parseModuleFile(file: string, modules: Record<string, string>) {
    if (!fileExists(file))
      exit(1, `Module file not found: ${file}`)

    const contents = readFileSync(file, 'utf-8')
    let sectionName: string

    this.verifyVariables(file, contents)

    if (!contents.includes('# $stax.append_to'))
      exit(1, `Must specify at least one "# $stax.append_to" directive in module: ${file}`)

    contents.split("\n").forEach((line) => {
      let matches = line.match(/# \$stax\.append_to (.*?)$/)

      if (matches && matches[1]) {
        sectionName = matches[1]
        modules[sectionName] ||= ''
        if (modules[sectionName] != '') modules[sectionName] += '\n'
        modules[sectionName] += `# ${sectionName}: ${file}`
      } else if (sectionName)
        modules[sectionName] += `\n${line}`
    })
    return modules
  }

  private verifyVariables(file: string, contents: string) {
    const matches = contents.match(/#{(.*?)}/g)

    if (!matches)
      return

    matches.forEach((match) => {
      const name = match.slice(2, -1)

      if (!this.data.build.args[name])
        exit(1, `Variable ${name} must be defined for ${file}`)
    })
  }

  private args(): string {
    return Object.entries(this.data.build.args).map(([name, value]) => `ARG ${name}="${value}"\n`).join('')
  }

  private parseBase(file: string, modules: Record<string, string>) {
    let text = ""

    if (!fileExists(file))
      exit(1, `File not found: ${file}`)

    readFileSync(this.data.build.base, 'utf-8').split("\n").forEach((line) => {
      const matches = line.trim().match(/# \$stax\.section +(.*?)$/)

      if (matches && matches[1] && modules[matches[1]])
        text += modules[matches[1]]
      else
        text += line + "\n"
    })

    text = this.substituteVariables(text)
    text = text.replaceAll('# $stax.section args', this.args())
    return text
  }

  private substituteVariables(dockerfile: string): string {
    for (const [name, value] of Object.entries(this.data.build.args)) {
      dockerfile = dockerfile.replaceAll(`#{${name}}`, value)
    }
    return dockerfile
  }
}
