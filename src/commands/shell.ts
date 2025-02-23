import { Command } from 'commander'
import Stax from '~/stax'

export default function registerShellCommand(program: Command, stax: Stax) {
  program.command('shell')
    .alias('sh')
    .argument('[name]', 'Name of application')
    .option('-s, --service <name>', 'Name of service to act on')
    .description('Shell into application\' primary container')
    .action(async (name, options) => stax.findContainer(name, options).shell())
}
