import { run } from './shell.js'

export function up(path) {
  // run(`npx devcontainer up --workspace-folder ${path}`)
  run(`docker compose --project-name n3x up --detach`, { cwd: path })
}

export function stop(container_name) {
  run(`docker compose --project-name n3x stop ${container_name}`)
}
