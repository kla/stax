import { Command } from 'commander'
import Stax from '~/stax'
import Staxfile from '~/staxfile'

const DEFAULT_CONTEXT_NAME = 'stax'

const stax = new Stax(DEFAULT_CONTEXT_NAME)
const program = new Command()
program.name('stax')

program.command('compile')
  .argument('<location>', 'Path to a Staxfile or directory with one')
  .description('Compile a Staxfile')
  .action(async location => {
    new Staxfile(stax.contextName, location).compile(true)
  })

program.command('setup')
  .argument('<location>', 'Path to or git repo of application')
  .description('Setup an applicaiton')
  .action(async location => stax.setup(location))

program.command('up')
  .argument('<app_name>', 'Name of application')
  .description('Start an application')
  .action(async app_name => stax.find(app_name).up())

program.command('down')
  .argument('<app_name>', 'Name of application')
  .description('Stop an application')
  .action(async app_name => stax.find(app_name).down())

program.command('remove')
  .alias('rm')
  .argument('<app_name>', 'Name of application')
  .description('Remove application')
  .action(async app_name => stax.find(app_name).remove())

program.command('exec')
  .argument('<app_name>', 'Name of application')
  .argument('<command>', 'Command to execute')
  .description('Execute a command in a running application')
  .action(async (app_name, command) => stax.find(app_name).exec(command))

program.command('rebuild')
  .argument('<app_name>', 'Name of application')
  .description('Rebuild an application')
  .action(app_name => stax.find(app_name).rebuild())

program.command('list')
  .alias('ps').alias('ls')
  .description('List applications')
    .action(() => stax.list())

program.command('shell')
  .alias('sh')
  .argument('<app_name>', 'Name of application')
  .description('Start a shell')
  .action(async app_name => stax.find(app_name).shell())

program.command('inspect')
  .argument('<app_name>', 'Name of application')
  .description('Inspect an application')
  .action(app_name => console.log(stax.find(app_name).containers))

program.command('logs')
  .argument('<app_name>', 'Name of application')
  .option('-f, --follow', 'Follow log output')
  .option('-t, --tail <number>', 'Number of lines to show from the end of the logs')
  .description('Tail logs for an application')
  .action(async (app_name, options) => {
    const follow = options.follow || false;
    const tail = options.tail ? parseInt(options.tail) : undefined;
    await stax.find(app_name).logs({ follow, tail });
  })

let args = process.argv

if (args[2] == 'exec' && process.argv.length > 5) {
  args = process.argv.slice(0, 4)
  args = args.concat(process.argv.slice(4, 9999).join(' '))
}

process.chdir(process.env.WORKING_DIRECTORY)
program.parse(args)
