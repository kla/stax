import { exit, isFile } from './utils'
import { fileExists, run, runCapture } from './shell'
import Container from './container'

function findDockerComposeFile(location) {
  if (isFile(location))
    return location

  const files = [
    `${location}/docker-compose.yaml`,
    `${location}/docker-compose.yml`
  ]
  return files.find(file => fileExists(file))
}

function compose(contextName, command, path, options={}) {
  let file
  const base = `docker compose --project-name ${contextName}`

  options = { append: true, ...options, env: { COMPOSE_IGNORE_ORPHANS: "1" } }

  // is path is actually a container name?
  if (Container.find(contextName, path))
    return run(`${base} ${command}${options.append ? ` ${path}` : ''}`, options)

  if ((file = findDockerComposeFile(path)))
    return run(`${base} -f ${file} ${command}`, options)

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
