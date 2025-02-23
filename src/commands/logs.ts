import { Command } from 'commander'
import Stax from '~/stax'

export default function registerLogsCommand(program: Command, stax: Stax) {
  program.command('logs')
    .argument('[name]', 'Name of application')
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
}
