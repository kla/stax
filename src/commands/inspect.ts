import { Command } from 'commander'
import { readFileSync } from 'fs'
import { capture } from '~/shell'
import { pp } from '~/utils'
import Stax from '~/stax'

export function registerInspectCommand(program: Command, stax: Stax) {
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
}
