import { csvKeyValuePairs, exit } from '~/utils'
import docker from '~/docker'
import Hooks from '~/hooks'
import Staxfile from '~/staxfile'
import App from './app'

interface FindOptions {
  warn?: boolean
  mustExist?: boolean
}

export default class Container {
  public attributes: Record<string, any>
  private _labels: Record<string, string>
  private _composeFile: string
  private hooks: Hooks

  constructor(attributes: Record<string, any>) {
    this.attributes = attributes
    this.hooks = new Hooks(this)
  }

  get labels(): Record<string, string> {
    return this._labels ? this._labels : (this._labels = csvKeyValuePairs(this.attributes.Labels))
  }

  get id(): string {
    return this.attributes.ID
  }

  get staxfile(): string {
    return this.vars.staxfile
  }

  get app(): string {
    return this.vars.app
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

  get contextName(): string{
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

  get uptime(): string {
    return this.attributes.RunningFor
  }

  get source(): string {
    return this.vars.source
  }

  private _vars: Record<string, string> | null = null
  get vars(): Record<string, string> {
    if (this._vars === null) {
      this._vars = {}
      for (const [key, value] of Object.entries(this.labels)) {
        if (key.startsWith('stax.'))
          this._vars[key.substring(5)] = value
      }
    }
    return this._vars
  }

  /**
   * Returns the docker compose configuration file for the container.
   * @returns The configuration file path.
   */
  get configFile(): string {
    return this.labels['com.docker.compose.project.config_files']
  }

  get composeFile(): string {
    return this._composeFile ||= new Staxfile({ contextName: this.contextName, source: this.source, staxfile: this.staxfile, appName: this.app }).compile()
  }

  static all(contextName: string): Container[] {
    return docker.ps(contextName)
      .map(attributes => new Container(attributes))
      .filter(container => container.contextName === contextName)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  static find(contextName: string, containerName: string, options: FindOptions={}): Container | undefined {
    const c = this.all(contextName).find(c => c.containerName == containerName)

    if (!c) {
      if (options.warn)
        console.warn(`🤷 Container '${name}@${contextName}' not found`)
      else if (options.mustExist)
        return exit(1, `👿 '${name}@${contextName}' is not a valid container name`)
    }

    return c
  }

  async down() {
    return docker.compose(this.contextName, 'stop', this.composeFile)
  }

  async up() {
    return docker.compose(this.contextName, 'start', this.composeFile, { exit: true })
  }

  async remove() {
    return docker.compose(this.contextName, 'rm --stop --force --volumes', this.composeFile)
  }

  async exec(command: string) {
    return docker.container(`exec -it ${this.containerName} ${command}`)
  }

  async rebuild() {
    App.setup({ contextName: this.contextName, source: this.source, staxfile: this.staxfile, appName: this.app })
    this.hooks.onPostBuild()
  }

  async shell() {
    const shells = [ '/bin/bash', '/bin/sh' ]
    shells.find(async (shell) => {
      try {
        await this.exec(shell)
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
    return docker.compose(this.contextName, command, this.composeFile)
  }

  async restart() {
    return docker.compose(this.contextName, `restart ${this.service}`, this.composeFile)
  }
}
