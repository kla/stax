import { execSync, spawn } from 'child_process'
import { RunOptions } from '~/types'
import chalk from 'chalk'

function outputCommand(command: string, { cwd, silent }: RunOptions): void {
  if (silent)
    return

  command = chalk.green(`> ${command}`)
  if (cwd) command += ` (in ${cwd})`
  console.log(command)
}

export function capture(command: string) {
  return execSync(command, { encoding: 'utf-8' }).trim()
}

export async function run(command: string, { env } = {}) {
  const shellOptions: any = {
    stdio: 'inherit',
    shell: true,
    env: env ? { ...process.env, ...env } : process.env
  }

  outputCommand(command, shellOptions)

  return new Promise((resolve, reject) => {
    const child = spawn(command, [], shellOptions)

    child.on('error', error => reject(error))

    child.on('close', (code) => {
      if (code !== 0)
        process.exit(code)
      else
        resolve(code)
    })
  })
}
