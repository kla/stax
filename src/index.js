import { Command } from 'commander'
import Stax from './stax'

const stax = new Stax('stax')
const program = new Command()
program.name('stax')

program.command('setup')
  .argument('<location>', 'Path to or git repo of application')
  .description('Setup an applicaiton')
  .action(location => stax.setup(location))

program.command('up')
  .argument('<name>', 'Name of application')
  .description('Start an application')
  .action(name => stax.find(name).up())

program.command('down')
  .argument('<name>', 'Name of application')
  .description('Stop an application')
  .action((name) => stax.find(name).down())

program.command('remove')
  .alias('rm')
  .argument('<name>', 'Name of application')
  .description('Remove application')
  .action((name) => stax.find(name).remove())

program.command('exec')
  .argument('<name>', 'Name of application')
  .argument('<command>', 'Command to execute')
  .description('Execute a command in a running application')
  .action((name, command) => stax.find(name).exec(command))

program.command('rebuild')
  .argument('<name>', 'Name of application')
  .description('Rebuild an application')
  .action((name) => stax.find(name).rebuild())

program.command('list')
  .alias('ps')
  .description('List applications')
    .action(() => stax.list())

program.command('shell')
  .alias('sh')
  .argument('<name>', 'Name of application')
  .description('Start a shell')
  .action((name) => stax.find(name).shell())

let args = process.argv

if (args[2] == 'exec' && process.argv.length > 5) {
  args = process.argv.slice(0, 4)
  args = args.concat(process.argv.slice(4, 9999).join(' '))
}

process.chdir(process.env.WORKING_DIRECTORY)
program.parse(args)
