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
    config.local = {
      base: base,
      workingDirectory: resolve(`./tmp/${config.name}`),
    }

    config.workspaceFolder ||= `/workspace/${config.name}`
    config.workspaceMount = `source=${config.local.base},target=${config.workspaceFolder},type=bind`

    return config
  }

  bindMount() {
    const obj = {}
    const pairs = this.config.workspaceMount.split(',')

    pairs.forEach((pair) => {
      const [key, value] = pair.split('=')
      obj[key] = value
    })

    return obj
  }

  generateComposeFile() {
    const compose = { services: {} }

    compose.services[this.config.name] = {
      image: this.config.image,
      command: 'sleep infinity',
      volumes: [ this.bindMount() ]
    }

    mkdirSync(this.config.local.workingDirectory, { recursive: true })
    writeFileSync(`${this.config.local.workingDirectory}/docker-compose.yaml`, yaml.dump(compose))
  }

  up() {
    this.generateComposeFile()
    up(this.config.local.workingDirectory)
  }
}

export default function devcontainer(path) {
  const configFile = `${path}/.devcontainer/devcontainer.json`
  return fileExists(configFile) ? new DevContainer(configFile) : null
}
