import { Command } from 'commander'
import { StaxConfig } from '~/types'
import Stax from '~/stax'

export function registerDuplicateCommand(program: Command, stax: Stax, overrides: StaxConfig) {
  program.command('duplicate')
    .argument('<name>', 'Name of application')
    .argument('<new-name>', 'Name of new application')
    .option('-i, --inspect', 'Show the compose file')
    .description('Duplicate an application')
    .action(async (name, newName, options) => { await stax.find(name).duplicate(newName, overrides as unknown as StaxConfig, options) })
}
