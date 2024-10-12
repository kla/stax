import { existsSync, readFileSync, writeFileSync } from 'fs'
import yaml from 'js-yaml'
import * as path from 'path'
import { verifyDirectory, resolve } from './utils'

function filename(): string {
  return path.join(process.env.STAX_HOME, 'settings.yaml')
}

function load() {
  return (existsSync(filename()) && yaml.load(readFileSync(filename(), 'utf-8'))) || {}
}

const settings = {
  read: function(name: string, defaultValue: any | undefined = undefined) {
    const settings = load()
    return settings[name] || defaultValue
  },

  write: function(name, value): any {
    if (name === 'services_home') verifyDirectory(value = resolve(value))

    const settings = { ...load() }
    settings[name] = value
    writeFileSync(filename(), yaml.dump(settings), 'utf-8')
    return value
  }
}

export default settings
