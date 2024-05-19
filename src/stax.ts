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
    this.apps().forEach((app) => {
      const status = app.status == 'running' ? '🟢' : '⚫'
      console.log(status, app.name, app.primary.attributes.State, app.primary.attributes.Status, app.primary.attributes.RunningFor)
    })
  }

  setup(location: string) {
    App.setup(this.name, location)
  }

  find(name: string) {
    return App.find(this.name, name)
  }

  apps(): App[] {
    return Container.all(this.name)
      .map(container => App.find(this.name, container.name))
  }
}
