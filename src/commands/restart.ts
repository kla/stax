import { Command } from 'commander'
import Stax from '~/stax'

export function registerRestartCommand(program: Command, stax: Stax) {
  program.command('restart')
    .argument('<name>')
    .description('Restart an application')
    .action(async name => { await stax.find(name).restart() })
}
