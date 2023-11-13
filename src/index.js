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
  .argument('<name>', 'Name of application')
  .description('Stop an application')
  .action((name) => app(name).down())

program.command('list')
  .description('List applications')
  .action(() => list())

program.parse(process.argv)
