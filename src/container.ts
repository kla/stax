import { exit } from 'process'
import { runCapture } from './shell'
import docker from './docker'

export default class Container {
  public attributes: Record<string, any>
  private _labels: Record<string, string>

  constructor(attributes) {
    this.attributes = attributes
  }

  get name() {
    return this.attributes.Names
  }

  get labels() {
    return this._labels ? this._labels : (this._labels = this.parseLabels(this.attributes.Labels))
  }

  get projectName() {
    return this.labels['com.docker.compose.project']
  }

  static all(contextName: string, options: any = {}) {
    return runCapture(`docker ps --all --format json`, { silent: true })
      .stdout
      .split("\n")
      .map(attributes => new Container(JSON.parse(attributes)))
      .filter(container => container.projectName === contextName)
  }

  static find(contextName, name, options={}) {
    const c = this.all(contextName, options).find(c => c.name == name)

    if (!c) {
      if (options.warn)
        console.warn(`🤷 Container '${container}' not found`)
      else if (options.mustExist) {
        console.error(`👿 '${name}' is not a valid container name`)
        exit(1)
      }
    }

    return c
  }


  parseLabels(labels: Record<string, string>) {
    return (labels || []).split(',').sort().reduce((labels, label) => {
      const [key, value] = label.split('=', 2);
      labels[key] = value;
      return labels;
    }, {})
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
