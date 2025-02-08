import { Command } from 'commander'
import Stax from '~/stax'
import installAutoComplete from '~/auto_complete'

export default function registerAutoCompleteCommand(program: Command, stax: Stax) {
  program.command('auto_complete')
    .description('Generate bash completion script')
    .action(() => installAutoComplete(stax))
}
