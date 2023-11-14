import { existsSync, statSync } from 'fs'
import { execa, execaSync } from 'execa'

export function directoryExists(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

export function fileExists(file) {
  return existsSync(file)
}

export async function run(command, options={}) {
  if (options.cwd && !directoryExists(options.cwd)) {
    console.error(`${options.cmd} does not exist`)
    return Promise.resolve({ stdout: null, stderr: null, code: -99 })
  }

  let cmd = `➡️ ${command}`
  if (options.cwd) cmd += ` (in ${options.cwd})`
  console.log(cmd)

  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    const parts = command.split(' ')

    execa(parts.shift(), parts, { ...options, stdio: 'inherit' })
      .on('close', (code) => {
        const args = { stdout, stderr, code }
        return code == 0 ? resolve(args) : reject(args)
      })
  })
}

export function runCapture(command, options={}) {
  if (options.cwd && !directoryExists(options.cwd)) {
    console.error(`${options.cmd} does not exist`)
    return null
  }

  let cmd = `➡️ ${command}`
  if (options.cwd) cmd += ` (in ${options.cwd})`
  console.log(cmd)

  const parts = command.split(' ')
  return execaSync(parts.shift(), parts, options)
}
