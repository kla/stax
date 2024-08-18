import { verifyFile } from '~/utils'
import { run, capture } from '~/shell'

async function compose(contextName: string, command: string, composeFile: string, options: Record<string,any> = {}) {
  const base = `docker compose --project-name ${contextName}`

  options = { append: true, ...options, env: { COMPOSE_IGNORE_ORPHANS: "1" } }
  options.exit && verifyFile(composeFile)

  return run(`${base} -f ${composeFile} ${command}`, options)
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
