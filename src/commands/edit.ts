import { exit } from "~/utils"
import { Command } from 'commander'
import { run } from "~/shell"
import Stax from '~/stax'

export function registerEditCommand(program: Command, stax: Stax) {
  const editor = process.env.STAX_EDITOR || 'code'

  program.command('edit')
    .argument('<name>', 'Name of application')
    .description(`Open application in a vscode based editor`)
    .action(async name => {
      const app = stax.find(name)
      let starting = false

      if (!app.primary.running) {
        starting = true
        console.log(`🚀 ${name} container(s) are not running. Starting them now."`)
        await app.up()
      }

      if (!app.primary.config.workspace)
        return exit(0, { message: `${name} has no 'workspace' defined.` })

      // kill vscode servers to fix problem where vscode can't access any files sometimes
      // when starting and trying to attach to the container
      if (!starting && (editor === 'code' || editor === 'cursor')) {
        const processToKill = `[${editor[0]}]${editor.slice(1)}-server`
        await app.primary.exec(`sh -c 'pkill --echo --full "${processToKill}" || true'`)
      }

      const hex = Buffer.from(JSON.stringify({ containerName: app.primary.containerName })).toString('hex')
      run(`${editor} --folder-uri=vscode-remote://attached-container+${hex}%${app.primary.config.workspace}`)
    })
}
