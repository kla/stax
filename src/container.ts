import { csvKeyValuePairs, exit } from './utils'
import docker from './docker'
import Hooks from './hooks'
import DevContainer from './dev_container'
import Feature from './dev_container/feature'

interface FindOptions {
  warn?: boolean
  mustExist?: boolean
}

export default class Container {
  public attributes: Record<string, any>
  public devContainer: DevContainer | null
  private _labels: Record<string, string>
  private hooks: Hooks

  constructor(attributes: Record<string, any>) {
    this.attributes = attributes
    this.hooks = new Hooks(this)
    this.devContainer = this.devContainerConfigFile ? new DevContainer(this.devContainerConfigFile) : null
  }

  get name(): string {
    return this.attributes.Names
  }

  get labels(): Record<string, string> {
    return this._labels ? this._labels : (this._labels = csvKeyValuePairs(this.attributes.Labels))
  }

  get projectName(): string{
    return this.labels['com.docker.compose.project']
  }

  get number(): number {
    return parseInt(this.labels['com.docker.compose.container-number'], 10)
  }

  get workingDirectory(): string {
    return this.labels['com.docker.compose.project.working_dir']
  }

  /**
   * Returns the path to the devcontainer configuration file for the container if there is one.
   */
  get devContainerConfigFile(): string {
    return this.labels['stax.dev.devcontainer']
  }

  /**
   * Returns the docker compose configuration file for the container.
   * @returns The configuration file path.
   */
  get configFile(): string {
    return this.labels['com.docker.compose.project.config_files']
  }

  get features(): Feature[] {
    return this.devContainer?.features || []
  }

  static all(contextName: string): Container[] {
    return docker.ps()
      .map(attributes => new Container(attributes))
      .filter(container => container.projectName === contextName)
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
    return docker.compose(this.projectName, 'stop', this.name)
  }

  async up() {
    return docker.compose(this.projectName, 'start', this.name, { exit: true })
  }

  async remove() {
    return docker.compose(this.projectName, 'rm --stop --force --volumes', this.name)
  }

  async exec(command: string) {
    return docker.compose(this.projectName, `exec -it ${this.name} ${command}`, this.name, { append: false })
  }

  async rebuild() {
    if (this.devContainerConfigFile)
      new DevContainer(this.devContainerConfigFile).generate()

    await docker.compose(this.projectName, `up --detach --force-recreate ${this.name}`, this.configFile, { exit: true })
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
