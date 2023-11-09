import { run } from './shell.js'

function parseContainerJson(line) {
  if (!line)
    return null

  const container = JSON.parse(line)
  container.Labels = parseLabels(container.Labels)

  return container
}

function parseLabels(labels) {
  return (labels || []).split(',').sort().reduce((labels, label) => {
    const [key, value] = label.split('=', 2);
    labels[key] = value;
    return labels;
  }, {})
}

export function containers() {
  return run(`docker ps --all --format json`, { silent: true })
    .stdout
    .split("\n")
    .map((line) => parseContainerJson(line))
    .filter((container) => container && container.Labels['com.docker.compose.project'] === 'n3x')
}

export function up(path) {
  // run(`npx devcontainer up --workspace-folder ${path}`)
  run(`docker compose --project-name n3x up --detach`, { cwd: path })
}

export function stop(container_name) {
  run(`docker compose --project-name n3x stop ${container_name}`)
}
