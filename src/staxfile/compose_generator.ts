import yaml from 'js-yaml'
import { writeFileSync } from 'fs'
import { deepRemoveKeys } from "~/utils"

interface ComposeOptions {
  staxfile?: string
  dockerfile?: string
}

export default class ComposeGenerator {
  public config: any
  public options: ComposeOptions

  constructor(config: any, options: ComposeOptions = undefined) {
    this.config = structuredClone(config)
    this.options = options

    if (options?.dockerfile)
      this.config.defaults.build.dockerfile = options.dockerfile

    this.addLabels()
  }

  compile(outputFile: string | undefined): string {
    const config = yaml.dump(deepRemoveKeys(this.config, [ 'defaults', 'modules' ]))

    if (outputFile) {
      writeFileSync(outputFile, config, 'utf-8')
      return outputFile
    }
    return config
  }

  private addLabels() {
    for (const name in this.config.services) {
      const service = this.config.services[name]

      service.labels = service.labels || {}
      service.labels['dev.stax.app'] = process.cwd().split("/").pop() // TODO: probably need a better way to do this later

      if (this.options.staxfile)
        service.labels['dev.stax.staxfile'] = this.options.staxfile
    }
  }
}
