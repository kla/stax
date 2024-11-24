import { Command } from 'commander'
import Stax from '~/stax'

export default function registerCopyCommand(program: Command, stax: Stax) {
  program.command('copy')
    .alias('cp')
  .argument('<name>', 'Name of application')
  .argument('<source>', 'Path to a local file or directory')
  .argument('<destination>', 'Path to a destination file or directory in the container')
  .option('-s, --service <name>', 'Name of service to act on')
  .option('-n, --dont-overwrite', 'Don\'t overwrite if file already exists')
    .description('Copy a file to the container')
    .action(async (name, source, destination, options) => stax.findContainer(name, options).copy(source, destination, options))
}
