import { exit } from 'process'
import { directoryExists, fileExists, run } from './shell.js'

const DEFAULT_PROJECT_NAME = 'n3x'
const COMPOSE_FILES = [ 'docker-compose.yaml', 'docker-compose.yml' ]

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
    .filter((container) => container && container.Labels['com.docker.compose.project'] === DEFAULT_PROJECT_NAME)
}

export function findContainer(containerName) {
  return containers().find((container) => container.Names == containerName)
}

function compose(command, options={}) {
  return run(`docker compose --project-name ${DEFAULT_PROJECT_NAME} ${command}`, options)
}

function devcontainer(command) {
  return run(`COMPOSE_PROJECT_NAME=${DEFAULT_PROJECT_NAME} npx devcontainer ${command}`)
}

function findDockerComposeFile(path) {
  if (!directoryExists(path))
    return null

  const file = COMPOSE_FILES.find((file) => fileExists(`${path}/${file}`))
  return file ? `${path}/${file}` : null
}

export function up(path) {
  if (findContainer(path))
    return compose(`start ${path}`)

  if (fileExists(`${path}/.devcontainer/devcontainer.json`))
    return devcontainer(`up --workspace-folder ${path}`)

  if (findDockerComposeFile(`${path}/.n3x`))
    return compose('up --detach', { cwd: `${path}/.n3x` })

  if (findDockerComposeFile(path))
    return compose('up --detach', { cwd: path })

  console.error(`👿 Please specify a valid container name or application directory`)
  exit(1)
}

export function stop(containerName) {
  return compose(`stop ${containerName}`)
}
