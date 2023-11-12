import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileExists } from './shell.js'
import { up } from './docker.js'
import { generateComposeFile } from './composer.js'

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

  up() {
    generateComposeFile(this.config)
    up(this.config.local.workingDirectory)
  }
}

export default function devcontainer(path) {
  const configFile = `${path}/.devcontainer/devcontainer.json`
  return fileExists(configFile) ? new DevContainer(configFile) : null
}
