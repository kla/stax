import { existsSync, readFileSync, writeFileSync } from 'fs'
import { verifyDirectory, resolve } from './utils'
import yaml from 'js-yaml'
import * as path from 'path'

function filename(): string {
  return path.join(process.env.STAX_HOME, 'settings.yaml')
}

function load() {
  return (existsSync(filename()) && yaml.load(readFileSync(filename(), 'utf-8'))) || {}
}

const settings = {
  all: load,

  isSettingName: (name: string) => Object.keys(load()).includes(name),

  read: (name: string, defaultValue: any | undefined = undefined) => {
    const settings = load()
    return settings[name] || defaultValue
  },

  write: (name: string, value: any) => {
    if (name === 'services_home') verifyDirectory(value = resolve(value))

    const settings = { ...load() }
    settings[name] = value
    writeFileSync(filename(), yaml.dump(settings), 'utf-8')
    return value
  },

  interpolate: (filePath: string) => {
    return filePath.replace(/\$(\w+)/g, (match, name) => settings.isSettingName(name) ? settings.read(name) : match)
  }
}

export default settings
