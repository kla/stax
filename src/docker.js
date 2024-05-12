import { dirname } from 'path'
import { exit } from './utils'
import { fileExists, run, runCapture } from './shell'

const DEFAULT_PROJECT_NAME = 'stax'

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
  return runCapture(`docker ps --all --format json`, { silent: true })
    .stdout
    .split("\n")
    .map((line) => parseContainerJson(line))
    .filter((container) => container && container.Labels['com.docker.compose.project'] === DEFAULT_PROJECT_NAME)
}

export function findContainer(container, options={}) {
  const c = containers().find(c => c.Names == container)

  if (!c && options.warn)
    console.warn(`🤷 Container '${container}' not found`)

  return c
}

export function findDockerComposeFile(location) {
  if (location.endsWith('.yml') || location.endsWith('.yaml'))
    return dirname(location)

  const files = [
    `${location}/docker-compose.yaml`,
    `${location}/docker-compose.yml`
  ]
  return files.find(file => fileExists(file))
}

function compose(command, path, options={}) {
  let cwd

  options = { append: true, ...options, env: { COMPOSE_IGNORE_ORPHANS: "1" } }
  command = `docker compose --project-name ${DEFAULT_PROJECT_NAME} ${command}`

  // is path is actually a container name?
  if (findContainer(path))
    return run(`${command}${options.append ? ` ${path}` : ''}`, options)

  // find the docker-compose.yaml file and set cwd to it's directory
  if ((cwd = findDockerComposeFile(path)))
    return run(command, { ...options, cwd: cwd })

  if (options.exit)
    exit(1, `👿 '${path}' is not a valid container name or application directory`)

  return null
}

export function up(path) {
  const command = findContainer(path) ? 'start' : 'up --detach'
  return compose(command, path, { exit: true })
}

export function stop(container) {
  return compose('stop', container)
}

export function remove(container) {
  return compose(`rm --stop --force`, container)
}

export function exec(container, command) {
  return compose(`exec ${container} ${command}`, container, { append: false })
}
