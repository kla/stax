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
  const args = command.split(' ')
  const executable = args.shift()
  const options: any = { stdio: 'inherit', tty: true }

  if (!executable)
    throw new Error('Please specify a command to run.')

  if (env)
    options.env = { ...process.env, ...env }

  outputCommand(command, options)

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, options)

    child.stdout.on('data', data => console.log(data.toString()))
    child.stderr.on('data', data => console.error(data.toString()))
    child.on('error', error => reject(error))

    child.on('close', (code) => {
      if (code !== 0)
        process.exit(code)
      else
        resolve(code)
    })
  })
}
