import { Command } from 'commander'
import Stax from '~/stax'

export default function registerRestartCommand(program: Command, stax: Stax) {
  program.command('restart')
    .argument('[name]', 'Name of application')
    .description('Restart an application')
    .action(async name => { await stax.find(stax.deduceAppName(name)).restart() })
}
