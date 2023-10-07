import { Command } from 'commander'
import { setup } from './setup'

const program = new Command()
program.name('n3xus')

program.command('up')
  .argument('<path>', 'Path to project')
  .description('Setup a new project')
  .option('-f, --force', 'Force setup')
  .action((path) => setup(path))

program.parse(process.argv)
