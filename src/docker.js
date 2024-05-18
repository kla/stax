import { dirname } from 'path'
import { exit } from './utils'
import { fileExists, run, runCapture } from './shell'
import containers from './containers'

const DEFAULT_PROJECT_NAME = 'stax'

function findDockerComposeFile(location) {
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
  if (containers.find(path))
    return run(`${command}${options.append ? ` ${path}` : ''}`, options)

  // find the docker-compose.yaml file and set cwd to it's directory
  if ((cwd = findDockerComposeFile(path)))
    return run(command, { ...options, cwd: cwd })

  if (options.exit)
    exit(1, `👿 '${path}' is not a valid container name or application directory`)

  return null
}

function setup(path) {
  return compose('up --detach', path, { exit: true })
}

const docker = { findDockerComposeFile, setup, compose }
export default docker
