import { containers } from './docker'

export function list() {
  containers().forEach((container) => {
    console.log(container.Names, container.State, container.Status, container.RunningFor)
  })
}
