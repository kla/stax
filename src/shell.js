import { existsSync, statSync } from 'fs'
import { execa, execaSync } from 'execa'
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

export async function run(command, options={}) {
  if (!(options = checkRunOptions(options)))
    return Promise.resolve({ stdout: null, stderr: null, code: -99 })

  outputCommand(command, options)

  return new Promise((resolve, reject) => {
    const parts = command.split(' ')
    const ret = execa(parts.shift(), parts, { ...options, stdio: 'inherit' })
    ret.on('close', (code) => code == 0 ? resolve(ret) : reject(ret))
  })
}

export function runCapture(command, options={}) {
  if (!checkRunOptions(command, options))
    return null

  outputCommand(command, options)

  const parts = command.split(' ')
  return execaSync(parts.shift(), parts, options)
}
