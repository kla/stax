import { existsSync, statSync } from 'fs'
import sh from 'shelljs'

export function directoryExists(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

export function fileExists(file) {
  return existsSync(file)
}

export function run(command, options={}) {
  if (options.cwd && !directoryExists(options.cwd)) {
    console.error(`${options.cmd} does not exist`)
    return
  }

  let cmd = `➡️ ${command}`
  if (options.cwd) cmd += ` (in ${options.cwd})`
  console.log(cmd)
  return sh.exec(command, options)
}
