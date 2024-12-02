import { verifyFile } from '~/utils'
import { run, capture } from '~/shell'
import { execSync } from 'child_process'
import { RunOptions } from '~/types'

async function compose(context: string, command: string, composeFile: string, options: Record<string,any> = {}) {
  const base = `docker compose --project-name ${context}`

  options = { append: true, ...options, env: { COMPOSE_IGNORE_ORPHANS: "1" } }
  options.exit && verifyFile(composeFile)

  return await run(`${base} -f ${composeFile} ${command}`, options as unknown as RunOptions)
}

async function container(command: string, options: RunOptions = {}) {
  return await run(`docker container ${command}`, options)
}

/**
 * Returns a list of all Docker containers.
 * @returns An array of strings representing the Docker containers.
 */
let psCache: any = {}
function ps(context: string): Array<Record<string,any>> {
  if (!psCache[context]) {
    const containerNames = capture(`docker ps --all --format "{{.Names}}" --filter "label=com.docker.compose.project=${context}"`).split("\n").join(" ")
    psCache[context] = containerNames.length > 0 ? JSON.parse(capture(`docker inspect ${containerNames}`)) : []
  }

  return psCache[context]
}

function clearInspectCache() {
  psCache = {}
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

function volumeExists(volume: string): boolean {
  return capture(`docker volume ls --format "{{.Name}}"`).split("\n").includes(volume)
}

async function volumeRemove(volume: string) {
  return await run(`docker volume rm "${volume}"`)
}

const inspectCache: Record<string, Record<string, any>> = {}
function inspect(containerName: string): Record<string, any> {
  if (containerName in inspectCache)
    return inspectCache[containerName]

  const data = JSON.parse(capture(`docker inspect ${containerName}`))[0]
  inspectCache[containerName] = data
  return data
}

const docker = { compose, container, ps, fileExists, volumeExists, volumeRemove, inspect, clearInspectCache }
export default docker
