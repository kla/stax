import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { exit } from './utils'
import Container from './container'
import devcontainer from './devcontainer'
import docker from './docker'

export default class App {
  public name: string
  public containers: Container[]

  constructor(name: string, containers: Container[]) {
    this.name = name
    this.containers = containers.sort((a, b) => a.number - b.number)
  }

  get status() {
    return this.primary.attributes.State
  }

  get primary(): Container {
    return this.containers[0]
  }

  static setup(contextName: string, location: string) {
    const original: string = location
    const dc = devcontainer(location)

    if (dc)
      location = dc.generate()

    if (location = docker.findDockerComposeFile(location)) {
      docker.setup(contextName, location)

      const yaml = load(readFileSync(location))

      // TODO: handle multiple services
      if (!(location = yaml.services[Object.keys(yaml.services)[0]].container_name))
        exit(1, `👿 No container_name found in ${location}`)
    } else
      exit(1, `👿 Couldn't setup a container for '${original}'`)

    return this.find(contextName, location)
  }

  static find(contextName: string, name: string): App {
    const container = Container.find(contextName, name, { mustExist: true })
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
}
