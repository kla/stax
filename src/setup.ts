import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { exit, isFile, fileExists } from './utils'
import App from './app'
import Container from './container'
import devcontainer from './devcontainer'
import docker from './docker'

function findDockerComposeFile(location) {
  if (isFile(location))
    return location

  const files = [
    `${location}/docker-compose.yaml`,
    `${location}/docker-compose.yml`
  ]
  return files.find(file => fileExists(file))
}

export default function setup(contextName: string, location: string) {
  const original: string = location
  const container: Container | undefined = Container.find(contextName, location)

  if (container)
    return exit(1, `👿 Container '${location}@${contextName}' has already been setup. Use 'rebuild' if you want to rebuild it.`)

  const dc = devcontainer(location)

  if (dc)
    location = dc.generate()

  if (!(location = findDockerComposeFile(location)))
    exit(1, `👿 Couldn't setup a container for '${original}'`)

  docker.compose(contextName, 'up --detach', location, { exit: true })

  const yaml = load(readFileSync(location))

  // TODO: handle multiple services
  if (!(location = yaml.services[Object.keys(yaml.services)[0]].container_name))
    exit(1, `👿 No container_name found in ${location}`)

  return App.find(contextName, location)
}
