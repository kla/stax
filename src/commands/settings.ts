import { Command } from 'commander'
import icons from '~/icons'
import settings from '~/settings'

export default function registerSettingsCommand(program: Command) {
  program.command('settings')
    .argument('[name]', 'Name of setting (can be key=value format)')
    .argument('[value]', 'Value of setting (optional if name is name=value)')
    .option('-s, --set', 'Set the value of the setting')
    .description('Get or set stax settings')
    .action((name, value, options) => {
      if (name?.includes('='))
        [name, value, options.set] = [...name.split('='), true]

      if (options.set) {
        value = settings.write(name, value)
        console.log(`${icons.saved} Setting for '${name}' set to '${value}'`)
      } else if (name) {
        console.log(settings.read(name))
      } else {
        console.log(settings.all())
      }
    })
}
