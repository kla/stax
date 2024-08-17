import { exit, verifyFile } from '~/utils'
import { run, capture } from '~/shell'
import Container from '~/container'

async function compose(contextName: string, command: string, path: string, options: Record<string,any> = {}) {
  const base = `docker compose --project-name ${contextName}`

  options = { append: true, ...options, env: { COMPOSE_IGNORE_ORPHANS: "1" } }

  // See if  path is actually a container name
  if (Container.find(contextName, path))
    return run(`${base} ${command}${options.append ? ` ${path}` : ''}`, options)

  options.exit && verifyFile(path)

  return run(`${base} -f ${path} ${command}`, options)
}

async function container(command: string) {
  return run(`docker container ${command}`)
}

/**
 * Returns a list of all Docker containers.
 * @returns An array of strings representing the Docker containers.
 */
function ps(contextName: string): Array<Record<string,any>> {
  return capture('docker ps --all --format json').split("\n").map(attributes => JSON.parse(attributes))
}

const docker = { compose, container, ps }
export default docker
