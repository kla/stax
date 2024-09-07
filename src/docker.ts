import { verifyFile } from '~/utils'
import { run, capture } from '~/shell'
import { execSync } from 'child_process'

async function compose(context: string, command: string, composeFile: string, options: Record<string,any> = {}) {
  const base = `docker compose --project-name ${context}`

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
function ps(context: string): Array<Record<string,any>> {
  return capture('docker ps --all --format json').split("\n").map(attributes => JSON.parse(attributes))
}

function fileExists(containerName: string, path: string): boolean {
  const checkCommand = `docker exec ${containerName} sh -c "test -e ${path}"`

  try {
    execSync(checkCommand)
    return true
  } catch (error) {
    if ('status' in error && error.status !== 1) {
      console.log('Error checking file existence:', error)
      throw error
    }
    return false
  }
}

const docker = { compose, container, ps, fileExists }
export default docker
