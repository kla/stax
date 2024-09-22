import { readFileSync, writeFileSync } from 'fs'
import { exit, verifyFile, truthy } from '~/utils'
import { BuildOptions } from '~/types'
import * as path from 'path'
import icons from '~/icons'

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
    return this.build.args ? Object.entries(this.build.args).map(([name, value]) => `ARG ${name}="${value}"\n`).join('') : ''
  }

  private loadModules(): Record<string, string> {
    if (!this.build.modules)
      return {}

    const modules: Record<string, string> = {}
    const included = []
    const excluded = []

    this.build.modules.forEach((module) => {
      if (!module.hasOwnProperty('if') || truthy(module['if'])) {
        const file = path.join(this.build.context, 'modules', module.name)
        included.push(module.name)
        this.parseModuleFile(file, modules)
      } else
        excluded.push(module.name)
    })

    if (included.length > 0)
      console.log(`${icons.success} Included modules: ${included.join(', ')}`)

    if (excluded.length > 0)
      console.log(`${icons.failed} Excluded modules: ${excluded.join(', ')}`)

    return modules
  }

  private parseModuleFile(file: string, modules: Record<string, string>) {
    verifyFile(file, 'Module file not found')

    const contents = readFileSync(file, 'utf-8')
    let sectionName: string

    if (!contents.includes('# $stax.append_to'))
      exit(1, `Must specify at least one "# $stax.append_to" expression in module: ${file}`)

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
