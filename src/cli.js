import { Command } from 'commander'
import { readFileSync } from 'fs'
import { run } from '~/shell'
import Stax from '~/stax'
import tmp from 'tmp'

const DEFAULT_CONTEXT_NAME = 'stax'

const stax = new Stax(DEFAULT_CONTEXT_NAME)
const program = new Command()
program.name('stax')

program.command('setup')
  .argument('<location>', 'Path to or git repo of application')
  .option('-s, --staxfile <staxfile>', 'Staxfile to use for setup')
  .description('Setup an application')
  .action(async (location, options) => stax.setup(({ source: location, ...options })))

program.command('up')
  .argument('<appName>', 'Name of application')
  .description('Start an application')
  .action(async appName => stax.find(appName).up())

program.command('down')
  .argument('<appName>', 'Name of application')
  .description('Stop an application')
  .action(async appName => stax.find(appName).down())

program.command('remove')
  .alias('rm')
  .argument('<appName>', 'Name of application')
  .description('Remove application')
  .action(async appName => stax.find(appName).remove())

program.command('exec')
  .argument('<appName>', 'Name of application')
  .argument('<command>', 'Command to execute')
  .description('Execute a command in a running application')
  .action(async (appName, command) => stax.find(appName).exec(command))

program.command('rebuild')
  .argument('<appName>', 'Name of application')
  .description('Rebuild an application')
  .action(appName => stax.find(appName).rebuild())

program.command('list')
  .alias('ps').alias('ls')
  .description('List applications')
    .action(() => stax.list())

program.command('shell')
  .alias('sh')
  .argument('<appName>', 'Name of application')
  .description('Start a shell')
  .action(async appName => stax.find(appName).shell())

program.command('inspect')
  .argument('<appName>', 'Name of application')
  .option('-c, --compose', 'Show the compose file')
  .option('-d, --dockerfile', 'Show the Dockerfile build (if any)')
  .description('Inspect the container and/or configuration files.')
  .action((appName, options) => {
    const app = stax.find(appName)

    if (options.compose)
      console.log(readFileSync(stax.find(appName).primary.composeFile, 'utf-8'))
    else if (options.dockerfile)
      console.log('TODO')
    else
      run(`docker inspect ${app.primary.containerName}`)
  })

program.command('logs')
  .argument('<appName>', 'Name of application')
  .option('-f, --follow', 'Follow log output')
  .option('-t, --tail <number>', 'Number of lines to show from the end of the logs')
  .description('Tail logs for an application')
  .action(async (appName, options) => {
    const follow = options.follow || false;
    const tail = options.tail ? parseInt(options.tail) : undefined;
    await stax.find(appName).logs({ follow, tail });
  })

program
  .command('restart <app>')
  .description('Restart an app')
  .action(async appName => stax.find(appName).restart())

let args = process.argv

if (args[2] == 'exec' && process.argv.length > 5) {
  args = process.argv.slice(0, 4)
  args = args.concat(process.argv.slice(4, 9999).join(' '))
}

tmp.setGracefulCleanup()
process.on('SIGINT', () => tmp.setGracefulCleanup() && process.exit())
process.chdir(process.env.WORKING_DIRECTORY)
program.parse(args)
