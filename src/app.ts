import Container from '~/container'
import Staxfile from '~/staxfile'
import setup from '~/setup'

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

  static async setup(contextName: string, location: string) {
    return setup(contextName, location)
  }

  static all(contextName: string): App[] {
    const containers = {}

    Container.all(contextName).forEach((container) => {
      if (!containers[container.app]) containers[container.app] = []
      containers[container.app].push(container)
    })

    return Object.keys(containers).map((name) => new App(name, containers[name]))
  }

  static find(contextName: string, name: string): App | null{
    const container = Container.find(contextName, name, { mustExist: true })

    if (!container) {
      console.warn(`🤷 App '${name}@${contextName}' not found`)
      return null
    }
    return new App(name, [container])
  }

  async down() {
    return Promise.all(this.containers.map(container => container.down()))
  }

  async up() {
    return Promise.all(this.containers.map(container => container.up()))
  }

  async remove() {
    return Promise.all(this.containers.map(container => container.remove()))
  }

  async exec(command: string) {
    return this.primary.exec(command)
  }

  async shell() {
    return this.primary.shell()
  }

  async logs(options: { follow?: boolean, tail?: number } = {}) {
    return this.primary.logs(options)
  }

  async rebuild() {
    return Promise.all(this.containers.map(container => container.rebuild()))
  }
}
