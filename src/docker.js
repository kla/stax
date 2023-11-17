import { exit } from './utils.js'
import { directoryExists, fileExists, run, runCapture } from './shell.js'

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
  return runCapture(`docker ps --all --format json`, { silent: true })
    .stdout
    .split("\n")
    .map((line) => parseContainerJson(line))
    .filter((container) => container && container.Labels['com.docker.compose.project'] === DEFAULT_PROJECT_NAME)
}

export function findContainer(containerName, options={}) {
  const c = containers().find((container) => container.Names == containerName)

  if (!c && options.warn)
    console.warn(`🤷 Container '${containerName}' not found`)

  return c
}

function findDockerComposeFile(paths) {
  paths = typeof(paths) == 'string' ? [ paths ] : paths
  return paths.find((path) => directoryExists(path) &&
    (fileExists(`${path}/docker-compose.yaml`) || fileExists(`${path}/docker-compose.yml`))
  )
}

function compose(command, path, options={}) {
  let cwd

  options = { append: true, ...options, env: { COMPOSE_IGNORE_ORPHANS: "1" } }
  command = `docker compose --project-name ${DEFAULT_PROJECT_NAME} ${command}`

  // is path is actually a container name?
  if (findContainer(path))
    return run(`${command}${options.append ? ` ${path}` : ''}`, options)

  // find the docker-compose.yaml file and set cwd to it's directory
  if ((cwd = findDockerComposeFile([ `${path}/.n3x`, path ])))
    return run(command, { ...options, cwd: cwd })

  if (options.exit)
    exit(1, `👿 '${path}' is not a valid container name or application directory`)

  return null
}

export function up(path) {
  const command = findContainer(path) ? 'start' : 'up --detach'
  return compose(command, path, { exit: true })
}

export function stop(path) {
  return compose('stop', path)
}

export function remove(containerName) {
  return compose(`rm --stop --force ${containerName}`)
}

export function exec(containerName, command) {
  return compose(`exec ${containerName} ${command}`, containerName, { append: false })
}
