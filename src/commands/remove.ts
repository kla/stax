import { Command } from 'commander'
import Stax from '~/stax'

export default function registerRemoveCommand(program: Command, stax: Stax) {
  program.command('remove')
    .alias('rm')
    .argument('<name>', 'Name of application')
    .description('Remove application')
    .action(async name => { await stax.find(name).remove() })
}
