import { resolve } from 'path'
import containers from './containers'

const CONFIG_DIRECTORY = resolve(`${process.env.HOME}/.stax`)

export default class Stax {
  constructor(name) {
    this.name = name
  }

  list() {
    containers.all(this.name).forEach((container) => {
      const status = container.attributes.State == 'running' ? '🟢' : '⚫'
      console.log(status, container.name, container.attributes.State, container.attributes.Status, container.attributes.RunningFor)
    })
  }
}
