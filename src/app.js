import devcontainer from './devcontainer.js'
import * as docker from './docker.js'

export default function app(path) {
  const devtainer = devcontainer(path)

  if (devtainer)
    path = devtainer.generate()

  return {
    up: () => docker.up(path),
    down: () => docker.stop(path),
  }
}
