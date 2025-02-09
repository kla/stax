import { readFileSync, rmSync } from 'fs'
import { cacheDir, exit, fileExists, pp, isEmpty } from '~/utils'
import { StaxConfig, SetupOptions, FindContainerOptions } from '~/types'
import { linkSshAuthSock } from './host_services'
import { confirm } from '@inquirer/prompts'
import chalk from 'chalk'
import Staxfile from '~/staxfile'
import icons from '~/icons'
import docker from '~/docker'
import Container from '~/container'
import settings from '~/settings'
import yaml from 'js-yaml'
import Config from './staxfile/config'

export default class App {
  public name: string
  public containers: Container[]

  constructor(name: string, containers: Container[]) {
    this.name = name
    this.containers = containers
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

  get config(): Config {
    return this.primary.config
  }

  get state() {
    const states = new Set(this.containers.map(container => container.state))
    return states.size == 1 ? [...states][0] : 'unhealthy'
  }

  static allContainers(context: string): Container[] {
    return docker.ps(context)
      .map(attributes => new Container(attributes))
      .filter(container => container.context === context)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  static all(context: string): App[] {
    const apps = {}

    this.allContainers(context).forEach((container) => {
      apps[container.app] ||= new App(container.app, [])
      apps[container.app].containers.push(container)
      apps[container.app].containers = apps[container.app].containers.sort((a: Container, b: Container) => a.number - b.number)
    })

    return Object.values(apps)
  }

  static find(context: string, appName: string, options={}): App | null {
    options = { mustExist: true, ...options }
    const app = App.all(context).find(app => app.name == appName)

    if (!app && options.mustExist)
      return exit(1, { message: `${icons.error} App '${appName}@${context}' not found`, trace: true })

    return app
  }

  static exists(context: string, name: string): boolean {
    return this.all(context).find(app => app.name == name) != null
  }

  static async setup(config: StaxConfig, options: SetupOptions = {}): Promise<App> {
    options = { cache: true, ...options }
    const staxfile = new Staxfile(config)
    const composeFile = await staxfile.compile({ force: true, excludes: options.rebuild ? [ 'prompt' ] : [] })

    if (!composeFile)
      return exit(1, { message: `👿 Couldn't setup a container for '${staxfile.source}'` })

    if (options.inspect) {
      this.inspect(staxfile, composeFile)
      return exit(0)
    }

    const buildArgs = [ 'build' ]
    if (!options.cache) buildArgs.push('--no-cache')
    if (options.progress) buildArgs.push(`--progress="${options.progress}"`)
    await docker.compose(staxfile.context, buildArgs.join(' '), composeFile, { exit: true })
    await docker.compose(staxfile.context, 'up --detach --force-recreate', composeFile, { exit: true })
    docker.clearInspectCache()
    const app = App.find(staxfile.context, staxfile.app)

    if (options.duplicate || (!options.rebuild && !staxfile.config.location.local))
      await app.primary.exec(`sh -c '[ -z "$(ls -A ${staxfile.compose.stax.workspace})" ] && git clone ${staxfile.config.source} ${staxfile.compose.stax.workspace} || echo "Directory not empty. Skipping git clone."'`)

    if (options.duplicate || !options.rebuild || options.runHooks)
      await app.primary.runHook('after_setup')

    return app
  }

  static inspect(staxfile: Staxfile, composeFile: string): boolean {
    console.log('# Stax config')
    pp({ stax: staxfile.config })
    console.log('\n# compose file')
    pp(yaml.load(readFileSync(composeFile, 'utf-8')))
    return true
  }

  async down() {
    return await docker.compose(this.context, 'stop', this.composeFile)
  }

  async up() {
    return await docker.compose(this.context, 'start', this.composeFile, { exit: true })
  }

  async remove() {
    const volume = `${this.context}_${this.primary.config.workspace_volume}`
    const cache = cacheDir(this.context, this.name)

    await docker.compose(this.context, 'rm --stop --force --volumes', this.composeFile)

    if (docker.volumeExists(volume)) {
      const response = await confirm({
        message: `Do you want to delete the workspace volume '${volume}'?`,
        default: false
      })

      if (response)
        await docker.volumeRemove(volume)
      else
        console.log(`${icons.warning}  Not deleting workspace volume`)
    }

    if (fileExists(cache)) {
      console.log(`${icons.trash}  Deleting cache directory ${cache}`)
      try {
        rmSync(cache, { recursive: true })
      } catch (error) {
        console.error(`👿 Error deleting cache directory ${cache}: ${error}`)
      }
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
        return exit(1, { message: `👿 No container found for a service named '${options.service}'. Valid services are: ${this.containers.map(container => container.service).join(', ')}` })
      return container
    }
    return this.primary
  }

  async rebuild(config: StaxConfig, options: SetupOptions = {}) {
    config = {
      ...this.primary.config,
      ...config,
      // can't change following on a rebuild
      context: this.context, source: this.primary.source, staxfile: this.primary.staxfile
    }
    await this.constructor.setup(config, { ...options, rebuild: true })
  }

  async duplicate(newName: string, config: StaxConfig, options: SetupOptions = {}) {
    if (this.constructor.exists(this.context, newName))
      return exit(1, { message: `${icons.error} An app named '${newName}' already exists.` })

    this.rebuild({ ...config, app: newName }, { ...options, duplicate: true })
    docker.clearInspectCache()
  }

  async restart() {
    linkSshAuthSock()
    return Promise.all(this.containers.map(container => container.restart()))
  }

  addAlias(alias: string) {
    const aliases = settings.read('aliases') || {}

    aliases[alias] = this.name
    settings.write('aliases', aliases)
    console.log(`${icons.success} Added alias '${alias}' for '${this.name}'`)
  }

  installedMessage(): string {
    const sh = chalk.blue(`'stax sh ${this.name}'`)
    const edit = chalk.blue(`'stax edit ${this.name}'`)
    let message = `${icons.info} ${this.name} installed. You can open a shell to its container with ${sh} (if it has a shell)`
    if (this.config.workspace) message += ` or open it in vscode with ${edit}`
    return message
  }
}
