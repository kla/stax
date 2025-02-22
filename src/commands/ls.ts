import { Command } from 'commander'
import Stax from '~/stax'

export default function registerLsCommand(program: Command, stax: Stax) {
  program.command('ls')
    .argument('[name]', 'Name of application')
    .alias('ps').alias('list')
    .description('List applications')
    .option('-c, --config <name>', 'Include specified config field', (value, previous) => previous.concat([value]), [])
    .option('-f, --full', 'Show all services')
    .option('-n, --list-names', 'List app names only')
    .action((name, options) => {
      if (options.listNames) {
        console.log(stax.apps().map(app => app.name).join("\n"))
      } else {
        stax.list({ app: name, fields: options.field || [], full: options.full })
      }
    })
}
