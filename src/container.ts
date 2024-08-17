import { csvKeyValuePairs, exit } from '~/utils'
import docker from '~/docker'
import Hooks from '~/hooks'

interface FindOptions {
  warn?: boolean
  mustExist?: boolean
}

export default class Container {
  public attributes: Record<string, any>
  private _labels: Record<string, string>
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

  get app(): string {
    return this.labels['dev.stax.app']
  }

  get service(): string {
    return this.labels['com.docker.compose.service']
  }

  get name(): string {
    return `${this.contextName}-${this.app}-${this.service}`
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

  /**
   * Returns the docker compose configuration file for the container.
   * @returns The configuration file path.
   */
  get configFile(): string {
    return this.labels['com.docker.compose.project.config_files']
  }

  static all(contextName: string): Container[] {
    return docker.ps(contextName)
      .map(attributes => new Container(attributes))
      .filter(container => container.contextName === contextName)
  }

  static find(contextName: string, name: string, options: FindOptions={}): Container | undefined {
    const c = this.all(contextName).find(c => c.name == name)

    if (!c) {
      if (options.warn)
        console.warn(`🤷 Container '${name}@${contextName}' not found`)
      else if (options.mustExist)
        return exit(1, `👿 '${name}@${contextName}' is not a valid container name`)
    }

    return c
  }

  async down() {
    return docker.compose(this.contextName, 'stop', this.name)
  }

  async up() {
    return docker.compose(this.contextName, 'start', this.name, { exit: true })
  }

  async remove() {
    return docker.compose(this.contextName, 'rm --stop --force --volumes', this.name)
  }

  async exec(command: string) {
    return docker.compose(this.contextName, `exec -it ${this.name} ${command}`, this.name, { append: false })
  }

  async rebuild() {
    await docker.compose(this.contextName, `up --detach --force-recreate ${this.name}`, this.configFile, { exit: true })
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
}
