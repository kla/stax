import path from 'path'
import { readFileSync } from 'fs'
import { exit, fileExists } from '~/utils'

interface BuildOptions {
  dockerfile: string;
  args: Record<string, string>;
  modules: string[];
}

export default class DockerfileCompiler {
  public build: BuildOptions

  constructor(options: BuildOptions) {
    this.build = options
  }

  public compile() {
    const base = this.parse()
    console.log(base)
  }

  private args(): string {
    return Object.entries(this.build.args).map(([name, value]) => `ARG ${name}="${value}"\n`).join('')
  }

  private parse() {
    const modules = this.loadModules()
    let text = ""

    if (!fileExists(this.build.dockerfile))
      exit(1, `File not found: ${this.build.dockerfile}`)

    readFileSync(this.build.dockerfile, 'utf-8').split("\n").forEach((line) => {
      const matches = line.trim().match(/# \$stax\.section +(.*?)$/)

      if (matches && matches[1] && modules[matches[1]])
        text += modules[matches[1]]
      else
        text += line + "\n"
    })

    text = text.replaceAll('# $stax.section args', this.args())
    return text
  }

  private loadModules(): Record<string, string> {
    if (!this.build.modules)
      return {}

    const dir = path.resolve(path.dirname(this.build.dockerfile))
    const modules: Record<string, string> = {}
    this.build.modules.forEach(item => this.parseModuleFile(`${dir}/modules/${item}`, modules))
    return modules
  }

  private parseModuleFile(file: string, modules: Record<string, string>) {
    if (!fileExists(file))
      exit(1, `Module file not found: ${file}`)

    const contents = readFileSync(file, 'utf-8')
    let sectionName: string

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
}
