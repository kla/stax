import { Command } from 'commander'
import { up } from './setup.js'

const program = new Command()
program.name('n3xus')

program.command('up')
  .argument('<path>', 'Path to application')
  .description('Start/setup an application')
  .action((path) => up(path))

program.parse(process.argv)
