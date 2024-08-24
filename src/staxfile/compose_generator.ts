import yaml from 'js-yaml'
import { writeFileSync } from 'fs'
import { deepRemoveKeys } from "~/utils"

interface ComposeOptions {
  staxfile?: string
  dockerfile?: string
}

export default class ComposeGenerator {
  public appName: string
  public config: any
  public options: ComposeOptions

  constructor(appName: string, config: any, options: ComposeOptions = undefined) {
    this.appName = appName
    this.config = structuredClone(config)
    this.options = options

    if (options?.dockerfile)
      this.config.defaults.build.dockerfile = options.dockerfile

    this.updateServices()
  }

  compile(outputFile: string | undefined): string {
    const config = yaml.dump(deepRemoveKeys(this.config, [ 'defaults', 'modules' ]))

    if (outputFile) {
      writeFileSync(outputFile, config, 'utf-8')
      return outputFile
    }
    return config
  }

  private updateServices() {
    const services = {}

    for (const [name, service] of Object.entries(this.config.services)) {
      service.image ||= `stax-${this.appName}`
      service.container_name = `stax-${this.appName}-${name}`
      service.hostname ||= `stax-${this.appName}-${name}`
      this.addLabels(name, service)
      services[`${this.appName}-${name}`] = service
    }

    this.config.services = services
  }

  private addLabels(name, service) {
    service.labels = service.labels || {}
    service.labels['dev.stax.app'] = this.appName

    if (this.options.staxfile)
      service.labels['dev.stax.staxfile'] = this.options.staxfile
  }
}
