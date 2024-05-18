import { exit } from 'process'
import { runCapture } from './shell'

const DEFAULT_PROJECT_NAME = 'stax'
let cache = null

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
}

function all() {
  if (!cache) {
    cache = runCapture(`docker ps --all --format json`, { silent: true })
      .stdout
      .split("\n")
      .map(attributes => new Container(JSON.parse(attributes)))
      .filter(container => container.projectName === DEFAULT_PROJECT_NAME)
  }
  return cache
}

function find(name, options={}) {
  const c = all().find(c => c.name == name)

  if (!c && options.warn)
    console.warn(`🤷 Container '${container}' not found`)

  return c
}

function verify(name) {
  if (!find(name)) {
    console.error(`👿 '${name}' is not a valid container name`)
    exit(1)
  }
}

const containers = { all, find, verify }
export default containers
