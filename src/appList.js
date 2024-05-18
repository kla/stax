import { containers } from './docker'

export function list() {
  containers().forEach((container) => {
    const status = container.State == 'running' ? '🟢' : '⚫'
    console.log(status, container.Names, container.State, container.Status, container.RunningFor)
  })
}
