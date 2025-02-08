import { Command } from 'commander'
import { StaxConfig } from '~/types'
import registerAliasCommand from './alias'
import registerCatCommand from './cat'
import registerLsCommand from './ls'
import registerConfigCommand from './config'
import registerCopyCommand from './copy'
import registerDownCommand from './down'
import registerDuplicateCommand from './duplicate'
import registerEditCommand from './edit'
import registerExecCommand from './exec'
import registerGetCommand from './get'
import registerInspectCommand from './inspect'
import registerLogsCommand from './logs'
import registerRebuildCommand from './rebuild'
import registerRemoveCommand from './remove'
import registerRestartCommand from './restart'
import registerSettingsCommand from './settings'
import registerSetupCommand from './setup'
import registerShellCommand from './shell'
import registerUpCommand from './up'
import registerLogoCommand from './logo'
import registerAutoCompleteCommand from './auto_complete'
import Stax from '~/stax'

const DEFAULT_CONTEXT_NAME = 'stax'

export function registerCommands(program: Command, overrides: StaxConfig) {
  const stax = new Stax(DEFAULT_CONTEXT_NAME)

  registerAliasCommand(program, stax)
  registerCatCommand(program, stax)
  registerLsCommand(program, stax)
  registerConfigCommand(program, stax)
  registerCopyCommand(program, stax)
  registerDownCommand(program, stax)
  registerDuplicateCommand(program, stax, overrides)
  registerEditCommand(program, stax)
  registerExecCommand(program, stax)
  registerGetCommand(program, stax)
  registerInspectCommand(program, stax)
  registerLogsCommand(program, stax)
  registerRebuildCommand(program, stax, overrides)
  registerRemoveCommand(program, stax)
  registerRestartCommand(program, stax)
  registerSettingsCommand(program)
  registerSetupCommand(program, stax, overrides)
  registerShellCommand(program, stax)
  registerUpCommand(program, stax)
  registerLogoCommand(program)
  registerAutoCompleteCommand(program)
}
