import { Command } from 'commander'
import Stax from '~/stax'

export default function registerUpCommand(program: Command, stax: Stax) {
  program.command('up')
    .argument('<name>', 'Name of application')
    .option('-s, --service <name>', 'Name of service to act on')
    .description('Start an application')
    .action(async (name, options) => {
      const target = options.service ? stax.findContainer(name, options) : stax.find(name)
      target.up()
    })
}
