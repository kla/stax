import { exit } from 'process'
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

  return app(location)
}

export function app(name, options={}) {
  if (options.containerMustExist)
    verifyContainerExists(name)

  return {
    up: () => docker.up(name),
    down: () => docker.stop(name),
    remove: () => docker.remove(name),
    exec: (command) => docker.exec(name, command),
    rebuild: () => { docker.stop(name); docker.up(name) },
  }
}
