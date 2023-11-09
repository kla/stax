import { Command } from 'commander'
import { stop, up } from './docker.js'

const program = new Command()
program.name('n3xus')

program.command('up')
  .argument('<path>', 'Path to application')
  .description('Start/setup an application')
  .action((path) => up(path))

program.command('down')
  .argument('<name>', 'Name of application')
  .description('Stop an application')
  .action((name) => stop(name))

program.parse(process.argv)
