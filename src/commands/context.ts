import { Command } from 'commander'
import settings from '~/settings'
import icons from '~/icons'
import Stax from '~/stax'
import { capture } from '~/shell'

export const DEFAULT_CONTEXT_NAME = 'stax'
export const CONTEXT_SETTING_NAME = 'context'

export function getContext(overrideContext?: string): string {
  return overrideContext || settings.read(CONTEXT_SETTING_NAME, DEFAULT_CONTEXT_NAME)
}

function listAllContexts(): string[] {
  const output = capture('docker ps --all --format "{{.Label \\"com.docker.compose.project\\"}}"')
  const contexts = [...new Set(output.split('\n').filter(Boolean))]
  return contexts.sort()
}

export default function registerContextCommand(program: Command, stax: Stax) {
  const context = program.command('context')
    .argument('[name]', 'Context name to switch to (shortcut for "context use <name>")')
    .description('Manage stax contexts (project isolation)')
    .action((name) => {
      if (name) {
        // Shortcut: `stax context <name>` is same as `stax context use <name>`
        settings.write(CONTEXT_SETTING_NAME, name)
        console.log(`${icons.saved} Switched to context '${name}'`)
      } else {
        const current = settings.read(CONTEXT_SETTING_NAME, DEFAULT_CONTEXT_NAME)
        console.log(current)
      }
    })

  context.command('use <name>')
    .description('Switch to a different context')
    .action((name) => {
      settings.write(CONTEXT_SETTING_NAME, name)
      console.log(`${icons.saved} Switched to context '${name}'`)
    })

  context.command('ls')
    .alias('list')
    .description('List all contexts with containers')
    .action(() => {
      const contexts = listAllContexts()
      const current = settings.read(CONTEXT_SETTING_NAME, DEFAULT_CONTEXT_NAME)

      if (contexts.length === 0) {
        console.log('No contexts found (no containers exist)')
        return
      }

      contexts.forEach(ctx => {
        const marker = ctx === current ? '* ' : '  '
        console.log(`${marker}${ctx}`)
      })
    })

  context.command('info [name]')
    .description('Show details about a context')
    .action((name) => {
      const contextName = name || settings.read(CONTEXT_SETTING_NAME, DEFAULT_CONTEXT_NAME)
      const contextStax = new Stax(contextName)
      const apps = contextStax.apps()

      console.log(`Context: ${contextName}`)
      console.log(`Apps: ${apps.length}`)
      apps.forEach(app => {
        console.log(`  - ${app.name} (${app.containers.length} container${app.containers.length === 1 ? '' : 's'})`)
      })
    })
}
