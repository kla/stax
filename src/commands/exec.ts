import { Command } from 'commander'
import Stax from '~/stax'

export default function registerExecCommand(program: Command, stax: Stax) {
  program.command('exec')
    .alias('run')
    .argument('<name>', 'Name of application')
    .argument('<command>', 'Command to execute. Use "--" before your command if it has more than one word.')
    .option('-s, --service <name>', 'Name of service to act on')
    .option('-q, --quiet', 'Don\'t print logging and info messages')
    .option('-h, --hook', 'Run a hook where the command is the name of the hook to run')
    .option('--script', 'Run a script, located on the host, inside the container')
    .description('Execute a command (or hook) in a running application')
    .action(async (name, command, options) => {
      const container = await stax.findContainer(name, options)

      if (options.hook)
        container.runHook(command)
      else
        container.exec(command, { quiet: options.quiet, script: options.script })
    })
}

