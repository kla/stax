import { Command } from 'commander'
import { list } from './appList.js'
import app from './app.js'

const program = new Command()
program.name('n3xus')

program.command('up')
  .argument('<path>', 'Path to application')
  .description('Start/setup an application')
  .action((path) => app(path).up())

program.command('down')
  .argument('<name>', 'Name or path to application')
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

program.command('list')
  .description('List applications')
  .action(() => list())

let args = process.argv

if (args[2] == 'exec' && process.argv.length > 5) {
  args = process.argv.slice(0, 4)
  args = args.concat(process.argv.slice(4, 9999).join(' '))
}

program.parse(args)
