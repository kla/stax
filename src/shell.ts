import { execa, execaSync } from 'execa'
import { spawn } from 'child_process'
import chalk from 'chalk'

/**
 * Represents the options for running a command.
 */
interface RunOptions {
  /**
   * The current working directory for the command.
   */
  cwd?: string

  /**
   * The command to be executed.
   */
  cmd?: string

  /**
   * Specifies whether the command should be executed silently.
   */
  silent?: boolean

  /**
   * The standard input/output streams for the command.
   */
  stdio?: 'inherit' | 'pipe' | 'ignore' | 'ipc' | (number | null | undefined)
}

function outputCommand(command: string, { cwd, silent }: RunOptions): void {
  if (silent)
    return

  command = chalk.green(`> ${command}`)
  if (cwd) command += ` (in ${cwd})`
  console.log(command)
}

export function run(command: string, options: RunOptions | null = {}) {
  options =  { ...options, stdio: 'inherit' }
  outputCommand(command, options)

  const parts = command.split(' ')
  return execaSync(parts.shift(), parts, options)
}

export function runCapture(command: string, options: RunOptions = {}) {
  outputCommand(command, options)

  const parts = command.split(' ')
  return execaSync(parts.shift(), parts, options)
}

export async function runAsync(command: string, { env } = {}) {
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
        reject(new Error(`Command exited with code ${code}`))
      else
        resolve(code)
    })
  })
}
