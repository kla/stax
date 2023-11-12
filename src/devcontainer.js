import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileExists } from './shell.js'
import { up } from './docker.js'
import * as yaml from 'js-yaml'

class DevContainer {
  constructor(configFile) {
    this.configFile = configFile
    this.config = this.loadConfig(configFile)
    console.log(this.config)
  }

  loadConfig() {
    const config = JSON.parse(readFileSync(this.configFile))
    const base = resolve(dirname(this.configFile) + '/..')

    config.name ||= base.split('/').pop()
    config.workspaceFolder ||= base
    return config
  }

  generateComposeFile() {
    const compose = { services: {} }

    compose.services[this.config.name] = {
      image: this.config.image,
      command: 'sleep infinity',
    }

    mkdirSync(`./tmp/${this.config.name}`, { recursive: true })
    writeFileSync(`./tmp/${this.config.name}/docker-compose.yaml`, yaml.dump(compose))
  }

  up() {
    this.generateComposeFile()
    up(`./tmp/${this.config.name}`)
  }
}

export default function devcontainer(path) {
  const configFile = `${path}/.devcontainer/devcontainer.json`
  return fileExists(configFile) ? new DevContainer(configFile) : null
}
