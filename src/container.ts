import { csvKeyValuePairs, exit } from './utils.ts'
import docker from './docker'
import DevContainer from './devcontainer.ts'

interface FindOptions {
  warn?: boolean
  mustExist?: boolean
}

export default class Container {
  public attributes: Record<string, any>
  private _labels: Record<string, string>

  constructor(attributes: Record<string, any>) {
    this.attributes = attributes
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

  static all(contextName: string): Container[] {
    return docker.ps()
      .map(attributes => new Container(JSON.parse(attributes)))
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

  down() {
    docker.compose(this.projectName, 'stop', this.name)
  }

  up() {
    docker.compose(this.projectName, 'start', this.name, { exit: true })
  }

  remove() {
    docker.compose(this.projectName, 'rm --stop --force --volumes', this.name)
  }

  exec(command: string) {
    docker.compose(this.projectName, `exec -it ${this.name} ${command}`, this.name, { append: false })
  }

  rebuild() {
    if (this.devContainerConfigFile)
      new DevContainer(this.devContainerConfigFile).generate()

    docker.compose(this.projectName, `up --detach --force-recreate ${this.name}`, this.configFile, { exit: true })
  }

  shell() {
    const shells = [ '/bin/bash', '/bin/sh' ]
    shells.find((shell) => {
      try {
        this.exec(shell)
        return true
      } catch (e) {
        return false
      }
    })
  }
}
