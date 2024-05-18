import { exit } from 'process'
import { runCapture } from './shell'
import docker from './docker'

const DEFAULT_PROJECT_NAME = 'stax'

class Container {
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

  parseLabels(labels) {
    return (labels || []).split(',').sort().reduce((labels, label) => {
      const [key, value] = label.split('=', 2);
      labels[key] = value;
      return labels;
    }, {})
  }

  down() {
    docker.compose('stop', this.name)
  }

  up() {
    docker.compose('start', this.name, { exit: true })
  }

  remove() {
    docker.compose('rm --stop --force --volumes', this.name)
  }

  exec(command) {
    docker.compose(`exec ${this.name} ${command}`, this.name, { append: false })
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

function all(options={}) {
  return runCapture(`docker ps --all --format json`, { silent: true })
    .stdout
    .split("\n")
    .map(attributes => new Container(JSON.parse(attributes)))
    .filter(container => container.projectName === DEFAULT_PROJECT_NAME)
}

function find(name, options={}) {
  const c = all(options).find(c => c.name == name)

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

const containers = { all, find }
export default containers
