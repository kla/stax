import { Command } from 'commander'
import { StaxConfig } from '~/types'
import Stax from '~/stax'

export default function registerRebuildCommand(program: Command, stax: Stax, overrides: StaxConfig) {
  program.command('rebuild')
    .argument('<name>', 'Name of application')
    .option('-i, --inspect', 'Show the compose file')
    .option('--no-cache', 'Don\'t use cache when building images')
    .option('--progress <progress>', 'Set type of progress output')
    .option('--run-hooks', 'Run the hooks after rebuilding')
    .description('Rebuild an application')
    .action(async (name, options) => await stax.find(name).rebuild(overrides, options))
}
