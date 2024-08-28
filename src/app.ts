import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { exit } from '~/utils'
import { StaxfileOptions  } from '~/staxfile'
import Staxfile from '~/staxfile'
import docker from '~/docker'
import Container from '~/container'

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

  static async setup(options: StaxfileOptions) {
    const staxfile = new Staxfile(options)
    const composeFile = staxfile.compile()

    if (!composeFile)
      return exit(1, `👿 Couldn't setup a container for '${staxfile.source}'`)

    await docker.compose(staxfile.contextName, 'up --detach --force-recreate --build', composeFile, { exit: true })
    return App.find(staxfile.contextName, this.getContainerName(composeFile))
  }

  static getContainerName(dockerComposeFile: string): string {
    const yaml = load(readFileSync(dockerComposeFile))
    const service = yaml.services[Object.keys(yaml.services)]

    // TODO: handle multiple services
    if (!service?.container_name)
      exit(1, `👿 No container_name found in ${dockerComposeFile}`)

    return service.container_name
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

  async rebuild({ vars = {} }: { vars?: Record<string, string> } = {}) {
    return Promise.all(this.containers.map(container => container.rebuild({ vars })))
  }

  async restart() {
    return Promise.all(this.containers.map(container => container.restart()))
  }
}
