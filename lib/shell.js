import { existsSync, statSync } from 'fs'
import { exec } from 'shelljs'

function directoryExists(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

export function run(command, options) {
  if (options.cmd && !directoryExists(path)) {
    console.error('Path does not exist')
    return
  }

  console.log(`➡️ ${command}`)
  exec(command, options)
}
