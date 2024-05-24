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
}

function checkRunOptions(options: RunOptions | null): RunOptions | null {
  if (options?.cwd && !directoryExists(options?.cwd)) {
    console.error(`${options.cmd} does not exist`)
    return null
  }
  return options
}

function outputCommand(command: string, { cwd, silent }: RunOptions): void {
  if (silent)
    return

  command = chalk.green(`> ${command}`)
  if (cwd) command += ` (in ${cwd})`
  console.log(command)
}

export function run(command: string, options: RunOptions | null = {}) {
  if (!(options = checkRunOptions(options)))
    return { stdout: null, stderr: null, code: -99 }

  outputCommand(command, options)

  const parts = command.split(' ')
  return execaSync(parts.shift(), parts, { ...options, stdio: 'inherit' })
}

export function runCapture(command: string, options: RunOptions = {}) {
  if (!checkRunOptions(options))
    return null

  outputCommand(command, options)

  const parts = command.split(' ')
  return execaSync(parts.shift(), parts, options)
}
