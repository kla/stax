import { readFileSync } from 'fs'
import { exit } from 'process'
import { load } from 'js-yaml'
import devcontainer from './devcontainer'
import * as docker from './docker'

function verifyContainerExists(name) {
  if (!docker.findContainer(name)) {
    console.error(`👿 '${name}' is not a valid container name`)
    exit(1)
  }
}

export function setup(location) {
  const dc = devcontainer(location)

  if (dc)
    location = dc.generate()

  if (location = docker.findDockerComposeFile(location)) {
    docker.up(location)

    const yaml = load(readFileSync(location))

    // TODO: handle multiple services
    if (!(location = yaml.services[Object.keys(yaml.services)[0]].container_name))
      exit(1, `👿 No container_name found in ${location}`)
  }

  verifyContainerExists(location)
  return app(location)
}

export function app(name, options={}) {
  verifyContainerExists(name)

  return {
    up: () => docker.up(name),
    down: () => docker.stop(name),
    remove: () => docker.remove(name),
    exec: (command) => docker.exec(name, command),
    rebuild: () => { docker.stop(name); docker.up(name) },
  }
}
