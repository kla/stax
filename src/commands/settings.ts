import { Command } from 'commander'
import icons from '~/icons'
import settings from '~/settings'

export default function registerSettingsCommand(program: Command) {
  program.command('settings')
    .argument('[name]', 'Name of setting')
    .argument('[value]', 'Value of setting')
    .option('-s, --set', 'Set the value of the setting')
    .description('Get or set stax settings')
    .action((name, value, options) => {
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
