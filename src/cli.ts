import { Command } from 'commander'
import { existsSync, mkdirSync } from 'fs'
import { parseAndRemoveWildcardOptions } from '~/utils'
import { StaxConfig } from '~/types'
import { registerCommands } from '~/commands'
import { version } from '../package.json'
import * as path from 'path'
import tmp from 'tmp'

function buildArgs() {
  let [ args, overrides ] = parseAndRemoveWildcardOptions(process.argv, '--stax.')
  const commandSeparator = args.indexOf('--')

  if (commandSeparator >= 0) {
    const command = args.slice(commandSeparator+1).join(' ')
    args = args.slice(0, commandSeparator)
    args.push(command)
  }

  if (args.includes('-v') || args.includes('--version')) {
    console.log(version)
    process.exit(0)
  }

  return [ args, overrides ]
}

function runProgram() {
  const program = new Command()
  const [ args, overrides ] = buildArgs()

  registerCommands(program, overrides as unknown as StaxConfig)
  program.name('stax')
  program.parse(args as string[])
}

function init() {
  process.env.STAX_HOME = path.join(process.env.HOME, '.stax')
  process.env.STAX_HOST_SERVICES = path.join(process.env.STAX_HOME, 'host-services')

  if (!existsSync(process.env.STAX_HOME)) mkdirSync(process.env.STAX_HOME)
  if (!existsSync(process.env.STAX_HOST_SERVICES)) mkdirSync(process.env.STAX_HOST_SERVICES)

  process.on('SIGINT', () => { tmp.setGracefulCleanup(); process.exit() })
  tmp.setGracefulCleanup()
}

init()
runProgram()
