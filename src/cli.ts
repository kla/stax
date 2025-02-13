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

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    /*
    workaround to fix what seems like an input problem with bun. triggers every time when you press
    enter multiple times during a prompt.

    TypeError: undefined is not an object
      at <anonymous> (native)
      at <anonymous> (native)
      at <anonymous> (native)
      at <anonymous> (native)
      at <anonymous> (native)
      at handleResult (native:36:41)
      at handleNativeReadableStreamPromiseResult2 (native:7:60)
      at processTicksAndRejections (native:7:39)
      at spawnSync (unknown)
      at spawnSync (node:child_process:233:22)

    this work around causes some input to get ignored and you'll have to press your
    keys multiple times for it to register but it's better than crashing.
    */
    if (reason instanceof TypeError && reason.message === 'undefined is not an object' && reason.stack?.includes('handleResult'))
      return

    if (reason instanceof Error) {
      console.error(reason.stack)
      process.exit(1)
    }
  })

  tmp.setGracefulCleanup()
}

init()
runProgram()
