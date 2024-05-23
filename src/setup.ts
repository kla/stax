import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { exit } from './utils'
import App from './app'
import Container from './container'
import devcontainer from './devcontainer'
import docker from './docker'

export default function setup(contextName: string, location: string) {
  const original: string = location
  const container = Container.find(contextName, location)

  if (container)
    exit(1, `👿 Container '${location}@${contextName}' already exists`)

  const dc = devcontainer(location)

  if (dc)
    location = dc.generate()

  if (!(location = docker.findDockerComposeFile(location)))
    exit(1, `👿 Couldn't setup a container for '${original}'`)

  docker.setup(contextName, location)

  const yaml = load(readFileSync(location))

  // TODO: handle multiple services
  if (!(location = yaml.services[Object.keys(yaml.services)[0]].container_name))
    exit(1, `👿 No container_name found in ${location}`)

  return App.find(contextName, location)
}
