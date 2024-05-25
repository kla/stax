import { execaSync } from 'execa'
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
