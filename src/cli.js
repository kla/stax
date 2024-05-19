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
  .argument('<app_name>', 'app_name of application')
  .description('Start an application')
  .action(app_name => stax.find(app_name).up())

program.command('down')
  .argument('<app_name>', 'app_name of application')
  .description('Stop an application')
  .action(app_name => stax.find(app_name).down())

program.command('remove')
  .alias('rm')
  .argument('<app_name>', 'app_name of application')
  .description('Remove application')
  .action(app_name => stax.find(app_name).remove())

program.command('exec')
  .argument('<app_name>', 'app_name of application')
  .argument('<command>', 'Command to execute')
  .description('Execute a command in a running application')
  .action((app_name, command) => stax.find(app_name).exec(command))

program.command('rebuild')
  .argument('<app_name>', 'app_name of application')
  .description('Rebuild an application')
  .action(app_name => stax.find(app_name).rebuild())

program.command('list')
  .alias('ps')
  .description('List applications')
    .action(() => stax.list())

program.command('shell')
  .alias('sh')
  .argument('<app_name>', 'app_name of application')
  .description('Start a shell')
  .action(app_name => stax.find(app_name).shell())

let args = process.argv

if (args[2] == 'exec' && process.argv.length > 5) {
  args = process.argv.slice(0, 4)
  args = args.concat(process.argv.slice(4, 9999).join(' '))
}

process.chdir(process.env.WORKING_DIRECTORY)
program.parse(args)