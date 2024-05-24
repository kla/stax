import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileExists, csvKeyValuePairs } from './utils'
import * as yaml from 'js-yaml'

export default class DevContainer {
  public configFile: string
  public config: Record<string, any>
  public dockerComposeFile: string

  constructor(configFile: string) {
    this.configFile = `${resolve(configFile)}/.devcontainer/devcontainer.json`
    this.config = this.loadConfig()

    if (this.config.local)
      this.dockerComposeFile = `${this.config.local.workingDirectory}/docker-compose.yaml`
  }

  isValid(): boolean {
    return fileExists(this.configFile)
  }

  loadConfig(): Record<string,any> {
    if (!this.isValid())
      return {}

    const config = JSON.parse(readFileSync(this.configFile).toString())
    const base = resolve(dirname(this.configFile) + '/..')

    config.name ||= base.split('/').pop()
    config.local = {
      base: base,
      workingDirectory: resolve(`./tmp/${config.name}`),
    }

    config.workspaceFolder ||= `/workspace/${config.name}`
    config.workspaceMount ||= `source=${config.local.base},target=${config.workspaceFolder},type=bind`

    return config
  }

  generate(): boolean {
    const compose = { services: {} }

    if (!this.isValid())
      return false

    compose.services[this.config.name] = {
      image: this.config.image,
      container_name: this.config.name,
      command: 'sleep infinity',
      volumes: [ this.config.workspaceMount.includes(',') ? csvKeyValuePairs(this.config.workspaceMount) : this.config.workspaceMount ],
      labels: {
        'stax.dev.devcontainer': this.configFile,
      },
    }

    mkdirSync(this.config.local.workingDirectory, { recursive: true })
    writeFileSync(this.dockerComposeFile, yaml.dump(compose))
    return true
  }
}
