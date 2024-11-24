import { Command } from 'commander'
import Stax from '~/stax'

export default function registerLsCommand(program: Command, stax: Stax) {
  program.command('ls')
    .alias('ps').alias('list')
    .description('List applications')
    .option('-f, --field <name>', 'Include specified config field', (value, previous) => previous.concat([value]), [])
    .action((options) => stax.list({ fields: options.field || [] }))
}
