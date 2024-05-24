import Container from './container'
import setup from './setup'

export default class App {
  public name: string
  public containers: Container[]

  constructor(name: string, containers: Container[]) {
    this.name = name
    this.containers = containers.sort((a: Container, b: Container) => a.number - b.number)
  }

  get status() {
    return this.primary.attributes.State
  }

  get primary(): Container {
    return this.containers[0]
  }

  static setup(contextName: string, location: string) {
    return setup(contextName, location)
  }

  static find(contextName: string, name: string): App | null{
    const container = Container.find(contextName, name, { mustExist: true })

    if (!container) {
      console.warn(`🤷 App '${name}@${contextName}' not found`)
      return null
    }

    return new App(name, [container])
  }

  down() {
    this.containers.forEach(container => container.down())
  }

  up() {
    this.containers.forEach(container => container.up())
  }

  remove() {
    this.containers.forEach(container => container.remove())
  }

  exec(command: string) {
    this.primary.exec(command)
  }

  shell() {
    this.primary.shell()
  }

  rebuild() {
    this.containers.forEach(container => container.rebuild())
  }
}
