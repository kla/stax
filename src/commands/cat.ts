import { Command } from 'commander'
import Stax from '~/stax'

export function registerCatCommand(program: Command, stax: Stax) {
  program.command('cat')
    .argument('<name>', 'Name of application')
    .argument('<file>', 'Path to a file in the container')
    .option('-s, --service <name>', 'Name of service to act on')
    .description('Show contents of a file from the container')
    .action(async (name, file, options) => {
      const container = stax.findContainer(name, options)
      await container.exec(`sh -c 'cat ${file} 2>/dev/null'`, { quiet: true })
    })
}
