import { exit, fileExists } from './utils'
import { runAsync, capture } from './shell'
import Container from './container'

async function compose(contextName: string, command: string, path: string, options: Record<string,any> = {}) {
  const base = `docker compose --project-name ${contextName}`

  options = { append: true, ...options, env: { COMPOSE_IGNORE_ORPHANS: "1" } }

  // See if  path is actually a container name
  if (Container.find(contextName, path))
    return runAsync(`${base} ${command}${options.append ? ` ${path}` : ''}`, options)

  if (options.exit && !fileExists(path))
    exit(1, `👿 '${path}' must point to a valid docker-compose yaml file`)

  return runAsync(`${base} -f ${path} ${command}`, options)
}

/**
 * Returns a list of all Docker containers.
 * @returns An array of strings representing the Docker containers.
 */
function ps(): Array<string> {
  return capture('docker ps --all --format json').split("\n")
}

const docker = { compose, ps }
export default docker
