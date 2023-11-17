import { existsSync, statSync } from 'fs'
import { execaSync } from 'execa'
import chalk from 'chalk'

export function directoryExists(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

export function fileExists(file) {
  return existsSync(file)
}

function checkRunOptions(options) {
  if (options.cwd && !directoryExists(options.cwd)) {
    console.error(`${options.cmd} does not exist`)
    return null
  }
  return options
}

function outputCommand(command, { cwd, silent }) {
  if (silent)
    return

  command = chalk.green(`> ${command}`)
  if (cwd) command += ` (in ${cwd})`
  console.log(command)
}

export function run(command, options={}) {
  if (!(options = checkRunOptions(options)))
    return { stdout: null, stderr: null, code: -99 }

  outputCommand(command, options)

  const parts = command.split(' ')
  return execaSync(parts.shift(), parts, { ...options, stdio: 'inherit' })
}

export function runCapture(command, options={}) {
  if (!checkRunOptions(command, options))
    return null

  outputCommand(command, options)

  const parts = command.split(' ')
  return execaSync(parts.shift(), parts, options)
}
