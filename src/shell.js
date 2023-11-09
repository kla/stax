import { existsSync, statSync } from 'fs'
import sh from 'shelljs'

export function directoryExists(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

export function run(command, options={}) {
  if (options.cwd && !directoryExists(options.cwd)) {
    console.error(`${options.cmd} does not exist`)
    return
  }

  console.log(`➡️ ${command}`)
  return sh.exec(command, options)
}
