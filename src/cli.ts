import { Command } from 'commander'
import { readFileSync } from 'fs'
import { run } from '~/shell'
import { parseAndRemoveWildcardOptions } from '~/utils'
import { StaxConfig } from '~/types'
import Stax from '~/stax'
import tmp from 'tmp'

const DEFAULT_CONTEXT_NAME = 'stax'

const editor = process.env.STAX_EDITOR || 'code'
const stax = new Stax(DEFAULT_CONTEXT_NAME)
const program = new Command()
program.name('stax')

program.command('setup')
  .argument('<location>', 'Path to a local directory or git repo of application')
  .option('-s, --staxfile <staxfile>', 'Staxfile to use for setup')
  .option('-i, --inspect', 'Show the compose file')
  .description('Setup an application')
  .action(async (location, options) => stax.setup({ source: location, ...options, ...overrides }, options))

program.command('rebuild')
  .argument('<name>', 'Name of application')
  .option('-i, --inspect', 'Show the compose file')
  .description('Rebuild an application')
  .action(async (name, options) => { await stax.find(name).rebuild(overrides as unknown as StaxConfig, options) })

program
  .command('restart <name>')
  .description('Restart an app')
  .action(async name => { await stax.find(name).restart() })

program.command('up')
  .argument('<name>', 'Name of application')
  .description('Start an application')
  .action(async name => { await stax.find(name).up() })

program.command('down')
  .argument('<name>', 'Name of application')
  .description('Stop an application')
  .action(async name => { await stax.find(name).down() })

program.command('remove')
  .alias('rm')
  .argument('<name>', 'Name of application')
  .description('Remove application')
  .action(async name => { await stax.find(name).remove() })

program.command('exec')
  .argument('<name>', 'Name of application')
  .argument('<command>', 'Command to execute')
  .description('Execute a command in a running application')
  .action(async (name, command) => { await stax.find(name).exec(command) })

program.command('shell')
  .alias('sh')
  .argument('<name>', 'Name of application')
  .description('Start a shell')
  .action(async name => stax.find(name).shell())

program.command('list')
  .alias('ps').alias('ls')
  .description('List applications')
  .action(() => stax.list())

program.command('edit')
  .argument('<name>', 'Name of application')
  .description(`Open application in vscode`)
  .action(async name => {
    const app = stax.find(name)

    if (!app.primary.running) {
      app.up()
      console.log(`🚀 ${name} container(s) are not running. Starting them now."`)
    }

    const hex = Buffer.from(JSON.stringify({ containerName: app.primary.containerName })).toString('hex')
    run(`${editor} --folder-uri=vscode-remote://attached-container+${hex}%${app.primary.config.workspace}`)
  })

program.command('config')
  .argument('<name', 'Name of application')
  .description('Show config variables for the container.')
  .action(name => {
    const container = stax.find(name).primary
    const attributes = { ...container.config, labels: container.labels }
    console.log(attributes)
  })

program.command('inspect')
  .argument('<name>', 'Name of application')
  .option('-c, --compose', 'Show the compose file')
  .option('-d, --dockerfile', 'Show the Dockerfile build (if any)')
  .option('-l, --labels', 'Show container labels')
  .description('Inspect the container or build files.')
  .action((name, options) => {
    const app = stax.find(name)

    if (options.compose)
      console.log(readFileSync(stax.find(name).primary.composeFile, 'utf-8'))
    else if (options.dockerfile)
      console.log('TODO')
    else if (options.labels)
      console.log(app.primary.labels)
    else
      run(`docker inspect ${app.primary.containerName}`)
  })

program.command('logs')
  .argument('<name>', 'Name of application')
  .option('-f, --follow', 'Follow log output')
  .option('-t, --tail <number>', 'Number of lines to show from the end of the logs')
  .description('Tail logs for an application')
  .action(async (name, options) => {
    const follow = options.follow || false
    const tail = options.tail ? parseInt(options.tail) : undefined
    await stax.find(name).logs({ follow, tail })
  })

let [ args, overrides ] = parseAndRemoveWildcardOptions(process.argv, '--stax.')

if (args[2] == 'exec' && process.argv.length > 5) {
  args = process.argv.slice(0, 4)
  args = args.concat(process.argv.slice(4, 9999).join(' '))
}

tmp.setGracefulCleanup()
process.on('SIGINT', () => { tmp.setGracefulCleanup(); process.exit() })
process.chdir(process.env.WORKING_DIRECTORY)
program.parse(args)
