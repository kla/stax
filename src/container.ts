import { exit } from 'process'
import { csvKeyValuePairs } from './utils'
import docker from './docker'

interface FindOptions {
  warn?: boolean
  mustExist?: boolean
}

export default class Container {
  public attributes: Record<string, any>
  private _labels: Record<string, string>

  constructor(attributes) {
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
      else if (options.mustExist) {
        console.error(`👿 '${name}@${contextName}' is not a valid container name`)
        exit(1)
      }
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

  exec(command) {
    docker.compose(this.projectName, `exec ${this.name} ${command}`, this.name, { append: false })
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
