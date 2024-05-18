import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { exit } from './utils'
import devcontainer from './devcontainer'
import containers from './containers'
import docker from './docker'

export function setup(location) {
  const original = location
  const dc = devcontainer(location)

  if (dc)
    location = dc.generate()

  if (location = docker.findDockerComposeFile(location)) {
    docker.setup(location)

    const yaml = load(readFileSync(location))

    // TODO: handle multiple services
    if (!(location = yaml.services[Object.keys(yaml.services)[0]].container_name))
      exit(1, `👿 No container_name found in ${location}`)
  } else
    exit(1, `👿 Couldn't setup a container for '${original}'`)

  return app(location)
}

export function app(name) {
  return containers.find(name, { fresh: true, mustExist: true })
}
