import { exit } from 'process'
import devcontainer from './devcontainer.js'
import * as docker from './docker.js'

export default function app(path, options={}) {
  if (options.containerMustExist && !docker.findContainer(path)) {
    console.error(`👿 '${path}' is not a valid container name`)
    exit(1)
  }

  if (path) {
    const devtainer = devcontainer(path)

    if (devtainer)
      path = devtainer.generate()
  }

  return {
    up: () => docker.up(path),
    down: () => docker.stop(path),
    remove: () => docker.remove(path),
  }
}
