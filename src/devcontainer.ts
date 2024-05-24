import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileExists, csvKeyValuePairs } from './utils'
import * as yaml from 'js-yaml'

class DevContainer {
  public configFile: string
  public config: Record<string, any>

  constructor(configFile: string) {
    this.configFile = configFile
    this.config = this.loadConfig()
  }

  get path() {
    return this.config.local.workingDirectory
  }

  loadConfig(): Record<string,any> {
    const config = JSON.parse(readFileSync(this.configFile))
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

  generate(): string {
    this.generateComposeFile(this.config)
    return this.path
  }

  generateComposeFile(config: Record<string,any>): void {
    const compose = { services: {} }

    compose.services[config.name] = {
      image: config.image,
      container_name: config.name,
      command: 'sleep infinity',
      volumes: [ config.workspaceMount.includes(',') ? csvKeyValuePairs(config.workspaceMount) : config.workspaceMount ],
      labels: {
        'stax.dev.devcontainer': this.configFile,
      },
    }

    mkdirSync(config.local.workingDirectory, { recursive: true })
    writeFileSync(`${config.local.workingDirectory}/docker-compose.yaml`, yaml.dump(compose))
  }
}

export default function devcontainer(path: string): DevContainer | null {
  const configFile = `${resolve(path)}/.devcontainer/devcontainer.json`
  return fileExists(configFile) ? new DevContainer(configFile) : null
}
