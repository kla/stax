import { run } from './shell.js'

export function up(path) {
  // run(`npx devcontainer up --workspace-folder ${path}`)
  run(`docker compose --project-name n3x up --detach`, { cwd: path })
}
