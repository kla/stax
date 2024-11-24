import { Command } from 'commander'
import { pp } from '~/utils'
import Stax from '~/stax'

export default function registerConfigCommand(program: Command, stax: Stax) {
  program.command('config')
    .argument('<name>', 'Name of application')
  .option('-s, --service <name>', 'Name of service to act on')
  .option('-g, --get <name>', 'Get the value of a config variable')
  .description('Show config variables for the container.')
  .action((name, options) => {
    const container = stax.findContainer(name, options)

    if (options.get)
      console.log(container.config.fetch(options.get) || '')
    else
        pp({ ...container.config, labels: container.labels })
    })
}
