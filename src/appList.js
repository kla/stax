import containers from './containers'

export function list() {
  containers.all().forEach((container) => {
    const status = container.attributes.State == 'running' ? '🟢' : '⚫'
    console.log(status, container.name, container.attributes.State, container.attributes.Status, container.attributes.RunningFor)
  })
}
