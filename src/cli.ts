import { Command } from 'commander'
import { existsSync, mkdirSync } from 'fs'
import { capture, run } from '~/shell'
import { exit, parseAndRemoveWildcardOptions, pp } from '~/utils'
import icons from '~/icons'
import { StaxConfig } from '~/types'
import Stax from '~/stax'
import * as path from 'path'
import tmp from 'tmp'
import settings from './settings'
import setupWizard from './setup_wizard'

const DEFAULT_CONTEXT_NAME = 'stax'

const editor = process.env.STAX_EDITOR || 'code'
const stax = new Stax(DEFAULT_CONTEXT_NAME)
const program = new Command()

program.name('stax')

program.command('alias')
  .argument('[name]', 'Name of application')
  .argument('[alias]', 'Name of alias for application')
  .description('Create an alias for an application that can be used in place of the application\'s name when running commands')
  .action((name, alias) => {
    if (name && alias)
      return stax.find(name).addAlias(alias)

    const aliases = settings.read('aliases', null)

    if (aliases && Object.keys(aliases).length > 0) {
      console.log('Current aliases:')
      pp(aliases)
      console.log('\nUsage: stax alias [options] [name] [alias]')
    } else
      program.commands.find(cmd => cmd.name() === 'alias').help()
  })

program.command('cat')
  .argument('<name>', 'Name of application')
  .argument('<file>', 'Path to a file in the container')
  .option('-s, --service <name>', 'Name of service to act on')
  .description('Show contents of a file from the container')
  .action(async (name, file, options) => {
    const container = stax.findContainer(name, options)
    await container.exec(`sh -c 'cat ${file} 2>/dev/null'`, { quiet: true })
  })

program.command('config')
  .argument('<name>', 'Name of application')
  .option('-s, --service <name>', 'Name of service to act on')
  .option('-g, --get <name>', 'Get the value of a config variable')
  .description('Show config variables for the container.')
  .action((name, options) => {
    const container = stax.findContainer(name, options)

    if (options.get)
      console.log(container.config.fetch(options.get) || '')
    else
      pp({ ...container.config, labels: container.labels })
  })

program.command('copy')
  .alias('cp')
  .argument('<name>', 'Name of application')
  .argument('<source>', 'Path to a local file or directory')
  .argument('<destination>', 'Path to a destination file or directory in the container')
  .option('-s, --service <name>', 'Name of service to act on')
  .option('-n, --dont-overwrite', 'Don\'t overwrite if file already exists')
  .description('Copy a file to the container')
  .action(async (name, source, destination, options) => stax.findContainer(name, options).copy(source, destination, options))

program.command('down')
  .argument('<name>', 'Name of application')
  .option('-s, --service <name>', 'Name of service to act on')
  .description('Stop an application')
  .action(async (name, options) => {
    const target = options.service ? stax.findContainer(name, options) : stax.find(name)
    target.down()
  })

program.command('duplicate')
  .argument('<name>', 'Name of application')
  .argument('<new-name>', 'Name of new application')
  .option('-i, --inspect', 'Show the compose file')
  .description('Duplicate an application')
  .action(async (name, newName, options) => { await stax.find(name).duplicate(newName, overrides as unknown as StaxConfig, options) })

program.command('edit')
  .argument('<name>', 'Name of application')
  .description(`Open application in a vscode based editor`)
  .action(async name => {
    const app = stax.find(name)
    let starting = false

    if (!app.primary.running) {
      starting = true
      console.log(`🚀 ${name} container(s) are not running. Starting them now."`)
      await app.up()
    }

    if (!app.primary.config.workspace)
      return exit(0, { message: `${name} has no 'workspace' defined.` })

    // kill vscode servers to fix problem where vscode can't access any files sometimes
    // when starting and trying to attach to the container
    if (!starting && (editor === 'code' || editor === 'cursor')) {
      const processToKill = `[${editor[0]}]${editor.slice(1)}-server`
      await app.primary.exec(`sh -c 'pkill --echo --full "${processToKill}" || true'`)
    }

    const hex = Buffer.from(JSON.stringify({ containerName: app.primary.containerName })).toString('hex')
    run(`${editor} --folder-uri=vscode-remote://attached-container+${hex}%${app.primary.config.workspace}`)
  })

program.command('exec')
  .alias('run')
  .argument('<name>', 'Name of application')
  .argument('<command>', 'Command to execute. Use "--" before your command if it has more than one word.')
  .option('-s, --service <name>', 'Name of service to act on')
  .option('-q, --quiet', 'Don\'t print logging and info messages')
  .option('-h, --hook', 'Run a hook where the command is the name of the hook to run')
  .description('Execute a command (or hook) in a running application')
  .action(async (name, command, options) => {
    const container = await stax.findContainer(name, options)

    if (options.hook)
      container.runHook(command)
    else
      container.exec(command, { quiet: options.quiet })
  })

program.command('get')
  .argument('<name>', 'Name of application')
  .argument('<source>', 'File to copy from the container')
  .argument('<destination>', 'Local destination to copy the file to')
  .option('-s, --service <name>', 'Name of service to act on')
  .description('Copy a from the container')
  .action(async (name, source, destination, options) => stax.findContainer(name, options).get(source, destination))

program.command('inspect')
  .argument('<name>', 'Name of application')
  .option('-c, --compose', 'Show the compose file')
  .option('-d, --dockerfile', 'Show the Dockerfile build (if any)')
  .option('-l, --labels', 'Show container labels')
  .description('Inspect the container or build files.')
  .action((name, options) => {
    const app = stax.find(name)

    if (options.compose)
      pp(readFileSync(stax.find(name).primary.composeFile, 'utf-8'))
    else if (options.dockerfile)
      console.log('TODO')
    else if (options.labels)
      console.log(app.primary.labels)
    else
      pp(JSON.parse(capture(`docker inspect ${app.primary.containerName}`)))
  })

program.command('ls')
  .alias('ps').alias('list')
  .description('List applications')
  .option('-f, --field <name>', 'Include specified config field', (value, previous) => previous.concat([value]), [])
  .action((options) => stax.list({ fields: options.field || [] }))

program.command('logs')
  .argument('<name>', 'Name of application')
  .option('-s, --service <name>', 'Name of service to act on')
  .option('-f, --follow', 'Follow log output')
  .option('-t, --tail <number>', 'Number of lines to show from the end of the logs')
  .option('--since <since>', 'A time or duration string accepted by \'docker container logs\'')
  .description('Tail logs for an application')
  .action(async (name, options) => {
    const follow = options.follow || false
    const tail = options.tail ? parseInt(options.tail) : undefined
    const since = options.since
    await stax.findContainer(name, options).logs({ follow, tail, since })
  })

program.command('rebuild')
  .argument('<name>', 'Name of application')
  .option('-i, --inspect', 'Show the compose file')
  .option('--no-cache', 'Don\'t use cache when building images')
  .description('Rebuild an application')
  .action(async (name, options) => { await stax.find(name).rebuild(overrides as unknown as StaxConfig, options) })

program.command('remove')
  .alias('rm')
  .argument('<name>', 'Name of application')
  .description('Remove application')
  .action(async name => { await stax.find(name).remove() })

program.command('restart')
  .argument('<name>')
  .description('Restart an application')
  .action(async name => { await stax.find(name).restart() })

program.command('settings')
  .argument('<name>', 'Name of setting')
  .argument('[value]', 'Value of setting')
  .option('-s, --set', 'Set the value of the setting')
  .description('Get or set stax settings')
  .action((name, value, options) => {
    if (options.set) {
      value = settings.write(name, value)
      console.log(`${icons.saved} Setting for '${name}' set to '${value}'`)
    } else
      console.log(settings.read(name))
  })

program.command('setup')
  .argument('[location]', 'Path to a local directory or git repo of application')
  .option('-s, --staxfile <staxfile>', 'Staxfile to use for setup')
  .option('-i, --inspect', 'Show the compose file')
  .option('--no-cache', 'Don\'t use cache when building images')
  .description('Setup an application')
  .action(async (location, options) => {
    if (location) {
      const app = await stax.setup({ source: location, ...options }, { ...options, overrides: overrides })
      console.log('\n' + app.installedMessage())
    } else if (settings.read('services_home'))
      await setupWizard(stax)
    else
      console.log('Please specify an application location or set the services home directory.')
  })

program.command('shell')
  .alias('sh')
  .argument('<name>', 'Name of application')
  .option('-s, --service <name>', 'Name of service to act on')
  .description('Shell into application\' primary container')
  .action(async (name, options) => stax.findContainer(name, options).shell())

program.command('up')
  .argument('<name>', 'Name of application')
  .option('-s, --service <name>', 'Name of service to act on')
  .description('Start an application')
  .action(async (name, options) => {
    const target = options.service ? stax.findContainer(name, options) : stax.find(name)
    target.up()
  })

let [ args, overrides ] = parseAndRemoveWildcardOptions(process.argv, '--stax.')
const commandSeparator = args.indexOf('--')

if (commandSeparator >= 0) {
  const command = args.slice(commandSeparator+1).join(' ')
  args = args.slice(0, commandSeparator)
  args.push(command)
}

tmp.setGracefulCleanup()

process.env.STAX_HOME = path.join(process.env.HOME, '.stax')
process.env.STAX_HOST_SERVICES = path.join(process.env.STAX_HOME, 'host-services')

if (!existsSync(process.env.STAX_HOME)) mkdirSync(process.env.STAX_HOME)
if (!existsSync(process.env.STAX_HOST_SERVICES)) mkdirSync(process.env.STAX_HOST_SERVICES)

process.on('SIGINT', () => { tmp.setGracefulCleanup(); process.exit() })
program.parse(args)
