import { resolve } from 'path'
import App from './app'
import Container from './container'

const CONFIG_DIRECTORY = resolve(`${process.env.HOME}/.stax`)

export default class Stax {
  public name: string

  constructor(name: string) {
    this.name = name
  }

  list() {
    Container.all(this.name).forEach((container) => {
      const status = container.attributes.State == 'running' ? '🟢' : '⚫'
      console.log(status, container.name, container.attributes.State, container.attributes.Status, container.attributes.RunningFor)
    })
  }

  setup(location: string) {
    App.setup(this.name, location)
  }

  find(name: string) {
    return App.find(this.name, name)
  }
}
