import { Command } from 'commander'
import { StaxConfig } from '~/types'
import { requireDockerVersion } from '~/utils'
import setupWizard from '~/setup_wizard'
import Stax from '~/stax'
import settings from '~/settings'
import logo from '../logo'
import installAutoComplete from '~/auto_complete'
export default function registerSetupCommand(program: Command, stax: Stax, overrides: StaxConfig) {
  program.command('setup')
    .argument('[location]', 'Path to a local directory or git repo of application')
    .option('-s, --staxfile <staxfile>', 'Staxfile to use for setup')
    .option('-i, --inspect', 'Show the compose file')
    .option('--no-cache', 'Don\'t use cache when building images')
    .option('--progress <progress>', 'Set type of progress output')
    .description('Setup an application')
  .action(async (location, options) => {
    requireDockerVersion(27.0, 2.29)
    console.log(logo())

    if (location) {
      const app = await stax.setup({ source: location, ...options }, { ...options, overrides: overrides })
      console.log('\n' + app.installedMessage())
    } else if (settings.read('services_home'))
      await setupWizard(stax)
    else
      console.log('Please specify an application location or set the services home directory.')

    if (settings.read('auto_complete') === 'true')
      installAutoComplete(stax)
  })
}
