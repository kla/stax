import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { exit, isFile, fileExists } from '~/utils'
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

/**
 * Sets up a container for the specified context and location.
 *
 * @param contextName - The name of the stax context.
 * @param location - Path of application to setup.
 * @returns The corresponding App if the container is set up successfully.
 */
export default async function setup(contextName: string, location: string) {
  const original: string = location
  const container: Container | undefined = Container.find(contextName, location)
  const files = [ 'Staxfile', 'compose.yaml', 'docker-compose.yaml', 'docker-compose.yml' ].map(file => `${location}/${file}`)
  let composeFile: string | undefined

  if (container)
    return exit(1, `👿 Container '${location}@${contextName}' has already been setup. Use 'rebuild' if you want to rebuild it.`)

  if (location = files.find(file => fileExists(file)))
    composeFile = new Staxfile(location).compile().composeFile

  if (!composeFile)
    return exit(1, `👿 Couldn't setup a container for '${original}'`)

  await docker.compose(contextName, 'up --detach', composeFile, { exit: true })
  return App.find(contextName, getContainerName(composeFile))
}
