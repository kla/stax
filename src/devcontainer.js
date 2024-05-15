import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileExists } from './shell'
import { generateComposeFile } from './composer'

class DevContainer {
  constructor(configFile) {
    this.configFile = configFile
    this.config = this.loadConfig(configFile)
  }

  get path() {
    return this.config.local.workingDirectory
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
    config.workspaceMount ||= `source=${config.local.base},target=${config.workspaceFolder},type=bind`

    return config
  }

  generate() {
    generateComposeFile(this.config)
    return this.path
  }
}

export default function devcontainer(path) {
  const configFile = `${resolve(path)}/.devcontainer/devcontainer.json`
  return fileExists(configFile) ? new DevContainer(configFile) : null
}
