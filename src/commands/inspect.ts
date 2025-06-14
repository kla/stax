import { Command } from 'commander'
import { readFileSync } from 'fs'
import { capture } from '~/shell'
import { pp } from '~/utils'
import Stax from '~/stax'

function output(data: any, options: { json?: boolean }) {
  if (options.json)
    console.log(JSON.stringify(data))
  else if (typeof data === 'string')
    pp(data)
  else
    pp(data)
}

export default function registerInspectCommand(program: Command, stax: Stax) {
  program.command('inspect')
    .argument('[name]', 'Name of application')
    .option('-c, --compose', 'Show the compose file')
    .option('-d, --dockerfile', 'Show the Dockerfile build (if any)')
    .option('-l, --labels', 'Show container labels')
    .option('-j, --json', 'Output in raw JSON format')
    .description('Inspect the container or build files.')
    .action((name, options) => {
      name = stax.deduceAppName(name)
      const app = stax.find(name)

      if (options.compose) {
        const composeContent = readFileSync(stax.find(name).primary.composeFile, 'utf-8')
        output(composeContent, options)
      } else if (options.dockerfile) {
        console.log('TODO')
      } else if (options.labels) {
        output(app.primary.labels, options)
      } else {
        const inspectData = JSON.parse(capture(`docker inspect ${app.primary.containerName}`))
        output(inspectData, options)
      }
    })
}
