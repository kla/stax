import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { exit, isFile, fileExists } from './utils'
import App from './app'
import Container from './container'
import DevContainer from './dev_container'
import docker from './docker'

function findDockerComposeFile(location: string): string | undefined {
  if (isFile(location))
    return location

  const files = [
    `${location}/docker-compose.yaml`,
    `${location}/docker-compose.yml`
  ]
  return files.find(file => fileExists(file))
}

function getContainerName(dockerComposeFile: string): string {
  const yaml = load(readFileSync(dockerComposeFile))
  const service = yaml.services[Object.keys(yaml.services)]

  // TODO: handle multiple services
  if (!service?.container_name)
    exit(1, `👿 No container_name found in ${dockerComposeFile}`)

  return service.container_name
}

/**
 * Sets up a container for the specified context and location.
 *
 * @param contextName - The name of the stax context.
 * @param location - Path of application to setup.
 * @returns The corresponding App if the container is set up successfully.
 */
export default function setup(contextName: string, location: string) {
  const original: string = location
  const container: Container | undefined = Container.find(contextName, location)
  let composeFile: string | undefined

  if (container)
    return exit(1, `👿 Container '${location}@${contextName}' has already been setup. Use 'rebuild' if you want to rebuild it.`)

  const dc = new DevContainer(`${location}/.devcontainer/devcontainer.json`)

  if (dc.generate())
    location = dc.dockerComposeFile

  if (!(composeFile = findDockerComposeFile(location)))
    return exit(1, `👿 Couldn't setup a container for '${original}'`)

  docker.compose(contextName, 'up --detach', composeFile, { exit: true })
  return App.find(contextName, getContainerName(composeFile))
}
