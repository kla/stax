import { run } from './shell'

export function setup(path) {
  run('devcontainer up --workspace-folder .', { cwd: path })
}
