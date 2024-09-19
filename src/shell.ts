import { spawn, spawnSync } from 'child_process'
import { RunOptions } from '~/types'
import icons from '~/icons'
import chalk from 'chalk'

function outputCommand(command: string, { cwd, silent }: RunOptions): void {
  if (silent) return

  command = chalk.green(`${icons.play}  ${command}`)
  if (cwd) command += chalk.green(` (in ${cwd})`)
  console.log(command)
}

export function capture(command: string, options = {}) {
  options = { silent: true, encoding: 'utf8', shell: true, ...options }
  outputCommand(command, options)

  const result = spawnSync(command, [], options)
  const stdout = result.stdout ? result.stdout.toString().trim() : ''
  const stderr = result.stderr ? result.stderr.toString().trim() : ''

  if (result.error || result.status !== 0) {
    outputCommand(command, { silent: false })
    console.error(stdout, '\n', stderr)
    process.exit(result.status)
  }
  return stdout
}

export async function run(command: string, { env, cwd } = {}) {
  const shellOptions: any = {
    stdio: 'inherit',
    shell: true,
    env: env ? { ...process.env, ...env } : process.env,
    cwd: cwd,
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
