import { exit } from 'process'
import devcontainer from './devcontainer.js'
import * as docker from './docker.js'

function verifyContainerExists(name) {
  if (!docker.findContainer(name)) {
    console.error(`👿 '${name}' is not a valid container name`)
    exit(1)
  }
}

export default function app(pathOrName, options={}) {
  const dc = devcontainer(pathOrName)

  if (dc)
    pathOrName = dc.generate()

  if (options.containerMustExist)
    verifyContainerExists(pathOrName)

  return {
    up: () => docker.up(pathOrName),
    down: () => docker.stop(pathOrName),
    remove: () => docker.remove(pathOrName),
    exec: (command) => docker.exec(pathOrName, command),
    rebuild: () => { docker.stop(pathOrName); docker.up(pathOrName) },
  }
}
