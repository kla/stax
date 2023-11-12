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
    config.localWorkingDirectory = `./tmp/${config.name}`
    return config
  }

  generateComposeFile() {
    const compose = { services: {} }

    compose.services[this.config.name] = {
      image: this.config.image,
      command: 'sleep infinity',
    }

    mkdirSync(this.config.localWorkingDirectory, { recursive: true })
    writeFileSync(`${this.config.localWorkingDirectory}/docker-compose.yaml`, yaml.dump(compose))
  }

  up() {
    this.generateComposeFile()
    up(this.config.localWorkingDirectory)
  }
}

export default function devcontainer(path) {
  const configFile = `${path}/.devcontainer/devcontainer.json`
  return fileExists(configFile) ? new DevContainer(configFile) : null
}
