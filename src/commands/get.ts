import { Command } from 'commander'
import Stax from '~/stax'

export function registerGetCommand(program: Command, stax: Stax) {
  program.command('get')
    .argument('<name>', 'Name of application')
    .argument('<source>', 'File to copy from the container')
    .argument('<destination>', 'Local destination to copy the file to')
    .option('-s, --service <name>', 'Name of service to act on')
    .description('Copy a from the container')
    .action(async (name, source, destination, options) => stax.findContainer(name, options).get(source, destination))
}
