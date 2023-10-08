import { run } from './shell.js'

export function setup(path) {
  run(`npx devcontainer up --workspace-folder ${path}`)
}
