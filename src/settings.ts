import { existsSync, readFileSync, writeFileSync } from 'fs'
import yaml from 'js-yaml'
import path = require('path')

const filename = path.resolve(process.env.HOME, '.stax')

function load() {
  return (existsSync(filename) && yaml.load(readFileSync(filename, 'utf-8'))) || {}
}

const settings = {
  read: function(name: string, defaultValue: any | undefined) {
    const settings = load()
    return settings[name] || defaultValue
  },

  write: function(name, value) {
    const settings = { ...load() }
    settings[name] = value
    writeFileSync(filename, yaml.dump(settings), 'utf-8')
  }
}

export default settings
