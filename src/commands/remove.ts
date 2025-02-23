import { Command } from 'commander'
import { confirm } from '~/utils'
import Stax from '~/stax'

export default function registerRemoveCommand(program: Command, stax: Stax) {
  program.command('remove')
    .alias('rm')
    .argument('[name]', 'Name of application')
    .description('Remove application')
    .action(async (name) => {
      name = stax.deduceAppName(name)

      if (await confirm(`Are you sure you want to remove '${name}'?`))
        await stax.find(name).remove()
    })
}
