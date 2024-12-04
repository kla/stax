import { Command } from 'commander'
import Stax from '~/stax'

export default function registerLsCommand(program: Command, stax: Stax) {
  program.command('ls')
    .alias('ps').alias('list')
    .description('List applications')
    .option('-c, --config <name>', 'Include specified config field', (value, previous) => previous.concat([value]), [])
    .option('-f, --full', 'Show all services')
    .action((options) => stax.list({ fields: options.field || [], full: options.full }))
}
