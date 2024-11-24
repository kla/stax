import { Command } from 'commander'
import settings from '~/settings'

export function registerSettingsCommand(program: Command) {
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
}
