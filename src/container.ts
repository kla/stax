import { csvKeyValuePairs, exit } from '~/utils'
import { FindOptions, SetupOptions, StaxConfig } from '~/types'
import { readFileSync } from 'fs'
import docker from '~/docker'
import Hooks from '~/hooks'
import Staxfile from '~/staxfile'
import App from './app'
import Config from './staxfile/config'

export default class Container {
  public attributes: Record<string, any>
  private hooks: Hooks

  private _labels: Record<string, string> | undefined
  private _config: Config | undefined
  private _composeFile: string | undefined

  constructor(attributes: Record<string, any>) {
    this.attributes = attributes
    this.hooks = new Hooks(this)
  }

  get labels(): Record<string, string> {
    return this._labels ? this._labels : (this._labels = csvKeyValuePairs(this.attributes.Labels))
  }

  get config(): Config {
    if (!this._config) {
      this._config = new Config()

      for (const [key, value] of Object.entries(this.labels)) {
        if (key.startsWith('stax.'))
          this._config.set(key, value)
      }
    }
    return this._config
  }

  get id(): string {
    return this.attributes.ID
  }

  get staxfile(): string {
    return this.config.staxfile
  }

  get app(): string {
    return this.config.app
  }

  get service(): string {
    return this.labels['com.docker.compose.service']
  }

  get name(): string {
    return this.service
  }

  get containerName(): string {
    return this.attributes.Names
  }

  get context(): string{
    return this.labels['com.docker.compose.project']
  }

  get number(): number {
    return parseInt(this.labels['com.docker.compose.container-number'], 10)
  }

  get workingDirectory(): string {
    return this.labels['com.docker.compose.project.working_dir']
  }

  get state(): string {
    return this.attributes.State
  }

  get running(): boolean {
    return this.state == 'running'
  }

  get uptime(): string {
    return this.attributes.RunningFor
  }

  get source(): string {
    return this.config.source
  }

  /**
   * Returns the docker compose configuration file for the container.
   * @returns The configuration file path.
   */
  get configFile(): string {
    return this.labels['com.docker.compose.project.config_files']
  }

  get composeFile(): string {
    return this._composeFile ||= new Staxfile({ context: this.context, source: this.source, staxfile: this.staxfile, app: this.app }).compile()
  }

  static all(context: string): Container[] {
    return docker.ps(context)
      .map(attributes => new Container(attributes))
      .filter(container => container.context === context)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  static find(context: string, containerName: string, options: FindOptions={}): Container | undefined {
    const c = this.all(context).find(c => c.containerName == containerName)

    if (!c) {
      if (options.warn)
        console.warn(`🤷 Container '${name}@${context}' not found`)
      else if (options.mustExist)
        return exit(1, `👿 '${name}@${context}' is not a valid container name`)
    }

    return c
  }

  async down() {
    return docker.compose(this.context, 'stop', this.composeFile)
  }

  async up() {
    return docker.compose(this.context, 'start', this.composeFile, { exit: true })
  }

  async remove() {
    return docker.compose(this.context, 'rm --stop --force --volumes', this.composeFile)
  }

  async exec(command: string) {
    return docker.container(`exec --interactive --tty ${this.containerName} ${command}`)
  }

  async run(command: string) {
    return docker.compose(this.context, `run --rm ${this.name} ${command}`, this.composeFile)
  }

  async rebuild(config: StaxConfig, options: SetupOptions = {}) {
    config = {
      ...this.config,
      ...config,
      // can't change following on a rebuild
      context: this.context, source: this.source, staxfile: this.staxfile, app: this.app
    }

    App.setup(config, { ...options, rebuild: true })
    this.hooks.onPostBuild()
  }

  async shell() {
    const shells = [ '/bin/bash', '/bin/sh' ]
    shells.find(async (shell) => {
      try {
        await this[this.running ? 'exec' : 'run'](shell)
        return true
      } catch (e) {
        return false
      }
    })
  }

  async logs(options: { follow?: boolean, tail?: number } = {}) {
    let command = `logs ${this.service}`
    if (options.follow) command += ' --follow'
    if (options.tail) command += ` --tail=${options.tail}`
    return docker.compose(this.context, command, this.composeFile)
  }

  async restart() {
    return docker.compose(this.context, `restart ${this.service}`, this.composeFile)
  }
}
