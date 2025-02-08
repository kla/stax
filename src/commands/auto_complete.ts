import { Command } from 'commander'
import installAutoComplete from '~/auto_complete'

export default function registerAutoCompleteCommand(program: Command) {
  program.command('auto_complete')
    .description('Generate bash completion script')
    .action(() => installAutoComplete())
}
