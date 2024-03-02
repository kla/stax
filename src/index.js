import { Command } from 'commander'
import { list } from './appList.js'
import { setup, app } from './app.js'

const program = new Command()
program.name('stax')

program.command('up')
  .argument('<location>', 'Path to or git repo of application')
  .description('Start/setup an application')
  .action((location) => setup(location).up())

program.command('down')
  .argument('<name>', 'Name of application')
  .description('Stop an application')
  .action((name) => app(name).down())

program.command('remove')
  .alias('rm')
  .argument('<name>', 'Name of application')
  .description('Remove application')
  .action((name) => app(name, { containerMustExist: true }).remove())

program.command('exec')
  .argument('<name>', 'Name of application')
  .argument('<command>', 'Command to execute')
  .description('Execute a command in a running application')
  .action((name, command) => app(name, { containerMustExist: true }).exec(command))

program.command('rebuild')
  .argument('<name>', 'Name of application')
  .description('Rebuild an application')
  .action((name) => app(name).rebuild())

program.command('list')
  .description('List applications')
  .action(() => list())

let args = process.argv

if (args[2] == 'exec' && process.argv.length > 5) {
  args = process.argv.slice(0, 4)
  args = args.concat(process.argv.slice(4, 9999).join(' '))
}

program.parse(args)
