import { Command } from 'commander'
import logo from '../logo'

export default function registerLogoCommand(program: Command) {
  program.command('logo')
    .description('stax logo')
    .action(() => console.log(logo()))
}
