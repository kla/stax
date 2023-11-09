import { containers } from './docker.js'

export function list() {
  containers().forEach((container) => {
    console.log(container.Names, container.State, container.Status, container.RunningFor)
  })
}
