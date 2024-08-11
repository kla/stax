import path from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { exit, verifyFile } from '~/utils'

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

  compile(outputFile: string | undefined): string {
    const modules = this.loadModules()
    let text = ""

    verifyFile(this.build.dockerfile, 'Dockerfile not found')
    readFileSync(this.build.dockerfile, 'utf-8').split("\n").forEach((line) => {
      const matches = line.trim().match(/# \$stax\.section +(.*?)$/)

      if (matches && matches[1] && modules[matches[1]])
        text += modules[matches[1]]
      else
        text += line + "\n"
    })

    text = text.replaceAll('# $stax.section args', this.args())

    if (outputFile) {
      writeFileSync(outputFile, text, 'utf-8')
      return outputFile
    }
    return text
  }

  private args(): string {
    return Object.entries(this.build.args).map(([name, value]) => `ARG ${name}="${value}"\n`).join('')
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
    verifyFile(file, 'Module file not found')

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
