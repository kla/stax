import { exit } from 'process'
import { directoryExists, fileExists, run, runCapture } from './shell.js'
import devcontainer from './devcontainer.js'

const DEFAULT_PROJECT_NAME = 'n3x'

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
  return runCapture(`docker ps --all --format json`)
    .stdout
    .split("\n")
    .map((line) => parseContainerJson(line))
    .filter((container) => container && container.Labels['com.docker.compose.project'] === DEFAULT_PROJECT_NAME)
}

export function findContainer(containerName) {
  return containers().find((container) => container.Names == containerName)
}

async function compose(command, options={}) {
  options = { ...options, env: { COMPOSE_IGNORE_ORPHANS: "1" } }
  return run(`docker compose --project-name ${DEFAULT_PROJECT_NAME} ${command}`, options)
}

function findDockerComposeFile(paths) {
  paths = typeof(paths) == 'string' ? [ paths ] : paths
  return paths.find((path) => directoryExists(path) &&
    (fileExists(`${path}/docker-compose.yaml`) || fileExists(`${path}/docker-compose.yml`))
  )
}

export async function up(path) {
  if (findContainer(path))
    return compose(`start ${path}`)

  const dc = devcontainer(path)
  if (dc)
    return dc.up()

  if ((path = findDockerComposeFile([ `${path}/.n3x`, path ])))
    return compose('up --detach', { cwd: path })

  console.error(`👿 '${path}' is not a valid container name or application directory`)
  exit(1)
}

export function stop(containerName) {
  return compose(`stop ${containerName}`)
}

export function remove(containerName) {
  return compose(`rm --stop --force ${containerName}`)
}
