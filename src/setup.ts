import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { exit, isDirectory, fileExists, isFile } from '~/utils'
import App from '~/app'
import Container from '~/container'
import Staxfile from '~/staxfile'
import docker from '~/docker'

function getContainerName(dockerComposeFile: string): string {
  const yaml = load(readFileSync(dockerComposeFile))
  const service = yaml.services[Object.keys(yaml.services)]

  // TODO: handle multiple services
  if (!service?.container_name)
    exit(1, `👿 No container_name found in ${dockerComposeFile}`)

  return service.container_name
}

function findStaxfile(path): string {
  if (isDirectory(path)) {
    const files = [ 'Staxfile', 'compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml' ].map(file => `${path}/${file}`)
    path = files.find(file => fileExists(file))
  }

  if (!fileExists(path))
    exit(1, `👿 Couldn't find a Staxfile in ${path}`)

  return path
}

/**
 * Sets up a container for the specified context and location.
 *
 * @param contextName - The name of the stax context.
 * @param location - Path of application to setup.
 * @returns The corresponding App if the container is set up successfully.
 */
export default async function setup(contextName: string, location: string) {
  const original: string = location
  const staxfile = findStaxfile(location)
  const { composeFile } = new Staxfile(staxfile).compile()

  if (!composeFile)
    return exit(1, `👿 Couldn't setup a container for '${original}'`)

  await docker.compose(contextName, 'up --detach', composeFile, { exit: true })
  return App.find(contextName, getContainerName(composeFile))
}
