import { dirname } from 'path'
import { exit } from './utils'
import { fileExists, run, runCapture } from './shell'
import Container from './container'

function findDockerComposeFile(location) {
  if (location.endsWith('.yml') || location.endsWith('.yaml'))
    return dirname(location)

  const files = [
    `${location}/docker-compose.yaml`,
    `${location}/docker-compose.yml`
  ]
  return files.find(file => fileExists(file))
}

function compose(contextName, command, path, options={}) {
  let cwd

  options = { append: true, ...options, env: { COMPOSE_IGNORE_ORPHANS: "1" } }
  command = `docker compose --project-name ${contextName} ${command}`

  // is path is actually a container name?
  if (Container.find(contextName, path))
    return run(`${command}${options.append ? ` ${path}` : ''}`, options)

  // find the docker-compose.yaml file and set cwd to it's directory
  if ((cwd = findDockerComposeFile(path)))
    return run(command, { ...options, cwd: cwd })

  if (options.exit)
    exit(1, `👿 '${path}' is not a valid container name or application directory`)

  return null
}

function setup(contextName, path) {
  return compose(contextName, 'up --detach', path, { exit: true })
}

function ps()  {
  return runCapture('docker ps --all --format json', { silent: true })
    .stdout
    .split("\n")
}

const docker = { findDockerComposeFile, setup, compose, ps }
export default docker
