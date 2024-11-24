import { existsSync, readFileSync, writeFileSync } from 'fs'
import { exit, verifyDirectory, resolve } from './utils'
import yaml from 'js-yaml'
import * as path from 'path'

const VALID_NAMES = [ 'services_home' ]

function filename(): string {
  return path.join(process.env.STAX_HOME, 'settings.yaml')
}

function load() {
  return (existsSync(filename()) && yaml.load(readFileSync(filename(), 'utf-8'))) || {}
}

function validateName(name: string) {
  if (!VALID_NAMES.includes(name))
    exit(1, { message: `Invalid setting name: ${name}\nValid names are: ${VALID_NAMES.join(', ')}` } )
}

const settings = {
  all: function() { return load() },

  read: function(name: string, defaultValue: any | undefined = undefined) {
    validateName(name)
    const settings = load()
    return settings[name] || defaultValue
  },

  write: function(name: string, value): any {
    validateName(name)

    if (name === 'services_home') verifyDirectory(value = resolve(value))

    const settings = { ...load() }
    settings[name] = value
    writeFileSync(filename(), yaml.dump(settings), 'utf-8')
    return value
  }
}

export default settings
