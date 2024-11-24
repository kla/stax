import { Command } from 'commander'
import { pp } from '~/utils'
import settings from '~/settings'
import Stax from '~/stax'

export function registerAliasCommand(program: Command, stax: Stax) {
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
}
