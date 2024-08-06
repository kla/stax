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
    const includes = this.loadIncludes()
    const base = this.parseBase(this.data.build.base, includes)
    console.log(base)
  }

  private loadIncludes(): Record<string, string> {
    if (!this.data.build.includes)
      return {}

    const dir = path.resolve(path.dirname(this.data.build.base))
    const includes: Record<string, string> = {}
    this.data.build.includes.forEach(item => this.parseIncludeFile(`${dir}/${item}`, includes))
    return includes
  }

  private parseIncludeFile(file: string, includes: Record<string, string>) {
    if (!fileExists(file))
      exit(1, `Include file not found: ${file}`)

    const contents = readFileSync(file, 'utf-8')
    let sectionName: string

    this.verifyVariables(file, contents)

    if (!contents.includes('# $stax.append_to'))
      exit(1, `Must specify at least one "# $stax.append_to" directive in include file: ${file}`)

    contents.split("\n").forEach((line) => {
      let matches = line.match(/# \$stax\.append_to (.*?)$/)

      if (matches && matches[1]) {
        sectionName = matches[1]
        includes[sectionName] ||= ''
        if (includes[sectionName] != '') includes[sectionName] += '\n'
        includes[sectionName] += `# ${sectionName}: ${file}`
      } else if (sectionName)
        includes[sectionName] += `\n${line}`
    })
    return includes
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

  private parseBase(file: string, includes: Record<string, string>) {
    let text = ""

    if (!fileExists(file))
      exit(1, `File not found: ${file}`)

    readFileSync(this.data.build.base, 'utf-8').split("\n").forEach((line) => {
      const matches = line.trim().match(/# \$stax\.section +(.*?)$/)

      if (matches && matches[1] && includes[matches[1]])
        text += includes[matches[1]]
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
