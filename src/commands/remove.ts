import { Command } from 'commander'
import installAutoComplete from '~/auto_complete'
import docker from '~/docker'
import settings from '~/settings'
import Stax from '~/stax'

export default function registerRemoveCommand(program: Command, stax: Stax) {
  program.command('remove')
    .alias('rm')
    .argument('<name>', 'Name of application')
    .description('Remove application')
    .action(async name => {
      await stax.find(name).remove()

      if (settings.read('auto_complete') === 'true') {
        docker.clearInspectCache()
        installAutoComplete(stax)
      }
    })
}
