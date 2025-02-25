import { Command } from 'commander'
import Stax from '~/stax'

export default function registerDownCommand(program: Command, stax: Stax) {
  program.command('down')
    .argument('[name]', 'Name of application')
    .option('-s, --service <name>', 'Name of service to act on')
    .description('Stop an application')
    .action(async (name, options) => {
    const target = options.service ? stax.findContainer(name, options) : stax.find(stax.deduceAppName(name))
    target.down()
  })
}
