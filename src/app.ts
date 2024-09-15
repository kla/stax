import { readFileSync, rmSync } from 'fs'
import { cacheDir, exit, fileExists, pp } from '~/utils'
import { StaxConfig, SetupOptions, FindContainerOptions } from '~/types'
import { linkSshAuthSock } from './host_services'
import Staxfile from '~/staxfile'
import icons from '~/icons'
import docker from '~/docker'
import Container from '~/container'
import settings from '~/settings'
import yaml from 'js-yaml'
import prompts from 'prompts'

export default class App {
  public name: string
  public containers: Container[]

  constructor(name: string, containers: Container[]) {
    this.name = name
    this.containers = containers.sort((a: Container, b: Container) => a.number - b.number)
  }

  get context(): string {
    return this.primary.context
  }

  get composeFile(): string {
    return this.primary.composeFile
  }

  get primary(): Container {
    return this.containers[0]
  }

  get state() {
    const states = new Set(this.containers.map(container => container.state))
    return states.size == 1 ? [...states][0] : 'unhealthy'
  }

  static all(context: string): App[] {
    const containers = {}

    Container.all(context).forEach((container) => {
      if (!containers[container.app]) containers[container.app] = []
      containers[container.app].push(container)
    })

    return Object.keys(containers).map((name) => new App(name, containers[name]))
  }

  static find(context: string, containerName: string): App | null{
    const container = Container.find(context, containerName, { mustExist: true })

    if (!container) {
      console.warn(`${icons.warning} App '${containerName}@${context}' not found`)
      return null
    }
    return new App(containerName, [container])
  }

  static exists(context: string, name: string): boolean {
    return this.all(context).find(app => app.name == name) != null
  }

  static async setup(config: StaxConfig, options: SetupOptions = {}) {
    const staxfile = new Staxfile(config)
    const composeFile = staxfile.compile(true)

    if (!composeFile)
      return exit(1, `👿 Couldn't setup a container for '${staxfile.source}'`)

    if (options.inspect) {
      console.log('# Stax config')
      pp({ stax: staxfile.config })
      console.log('\n# compose file')
      pp(yaml.load(readFileSync(composeFile, 'utf-8')))
      process.exit()
    }

    await docker.compose(staxfile.context, 'up --detach --force-recreate --build', composeFile, { exit: true })
    const app = App.find(staxfile.context, `${staxfile.context}-` + Object.keys(staxfile.compose.services)[0])

    if (!options.rebuild && !staxfile.config.location.local)
      app.primary.exec(`git clone ${staxfile.config.source} ${staxfile.compose.stax.workspace}`)

    if (!options.rebuild)
      app.containers.forEach(async container => container.runHook('after_setup'))

    return app
  }

  async down() {
    return docker.compose(this.context, 'stop', this.composeFile)
  }

  async up() {
    return docker.compose(this.context, 'start', this.composeFile, { exit: true })
  }

  async remove() {
    const volume = `${this.context}_${this.primary.config.workspace_volume}`
    const cache = cacheDir(this.context, this.name)

    await docker.compose(this.context, 'rm --stop --force --volumes', this.composeFile)

    if (docker.volumeExists(volume)) {
      const response = await prompts({
        type: 'confirm',
        name: 'value',
        message: `Do you want to delete the workspace volume '${volume}'?`,
        initial: false
      })

      if (response.value)
        await docker.volumeRemove(volume)
    }

    if (fileExists(cache)) {
      console.log(`${icons.trash}  Deleting ${cache}`)
      rmSync(cache, { recursive: true })
    }
  }

  async exec(command: string) {
    linkSshAuthSock()
    return this.primary.exec(command)
  }

  findContainer(options: FindContainerOptions): Container {
    if (options.service) {
      const container = this.containers.find(container => container.service == options.service)
      if (!container)
        exit(1, `👿 No container found for a service named '${options.service}'. Valid services are: ${this.containers.map(container => container.service).join(', ')}`)
      return container
    }
    return this.primary
  }

  async rebuild(config: StaxConfig, options: SetupOptions = {}) {
    return Promise.all(this.containers.map(container => container.rebuild(config, options)))
  }

  async duplicate(newName: string, config: StaxConfig, options: SetupOptions = {}) {
    if (this.constructor.exists(this.context, newName))
      exit(1, `${icons.error} An app named '${newName}' already exists.`)

    this.rebuild({ ...config, app: newName }, options)
  }

  async restart() {
    linkSshAuthSock()
    return Promise.all(this.containers.map(container => container.restart()))
  }

  async runHooks() {
    this.containers.forEach(async container => container.runHooks())
  }

  addAlias(alias: string) {
    const aliases = settings.read('aliases') || {}

    aliases[alias] = this.name
    settings.write('aliases', aliases)
    console.log(`${icons.success} Added alias '${alias}' for '${this.name}'`)
  }
}
