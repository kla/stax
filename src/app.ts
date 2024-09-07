import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { exit } from '~/utils'
import { StaxConfig, SetupOptions } from '~/types'
import Staxfile from '~/staxfile'
import docker from '~/docker'
import Container from '~/container'
import settings from '~/settings'
import yaml from 'js-yaml'

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

  static all(context: string): App[] {
    const containers = {}

    Container.all(context).forEach((container) => {
      if (!containers[container.app]) containers[container.app] = []
      containers[container.app].push(container)
    })

    return Object.keys(containers).map((name) => new App(name, containers[name]))
  }

  static find(context: string, name: string): App | null{
    const container = Container.find(context, name, { mustExist: true })

    if (!container) {
      console.warn(`🤷 App '${name}@${context}' not found`)
      return null
    }
    return new App(name, [container])
  }

  static async setup(config: StaxConfig, options: SetupOptions = {}) {
    const staxfile = new Staxfile(config)
    const composeFile = staxfile.compile()

    if (!composeFile)
      return exit(1, `👿 Couldn't setup a container for '${staxfile.source}'`)

    if (options.inspect) {
      console.log('# config variables')
      console.log(yaml.dump({ config: staxfile.config }))
      console.log('# compose file')
      console.log(readFileSync(composeFile, 'utf-8'))
      process.exit()
    }

    await docker.compose(staxfile.context, 'up --detach --force-recreate --build', composeFile, { exit: true })
    const app = App.find(staxfile.context, this.getContainerName(composeFile))

    if (!options.rebuild && !staxfile.config.location.local)
      app.primary.exec(`git clone ${staxfile.config.source} ${staxfile.compose.stax.workspace}`)

    if (!options.rebuild)
      app.containers.forEach(async container => container.runHook('after_setup'))

    return app
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

  async rebuild(config: StaxConfig, options: SetupOptions = {}) {
    return Promise.all(this.containers.map(container => container.rebuild(config, options)))
  }

  async restart() {
    return Promise.all(this.containers.map(container => container.restart()))
  }

  async runHooks() {
    this.containers.forEach(async container => container.runHooks())
  }

  addAlias(alias) {
    const aliases = settings.read('aliases') || {}

    aliases[alias] = this.name
    settings.write('aliases', aliases)
  }
}
