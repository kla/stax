import { resolve } from 'path'
import { exit } from '~/utils'
import tmp from 'tmp'
import App from '~/app'
import Container from '~/container'

const CONFIG_DIRECTORY = resolve(`${process.env.HOME}/.stax`)

export default class Stax {
  public name: string

  constructor(name: string) {
    this.name = name
    tmp.setGracefulCleanup()
  }

  list() {
    this.apps().forEach((app) => {
      const status = app.status == 'running' ? '🟢' : '⚫'
      console.log(status, app.name, app.primary.attributes.State, app.primary.attributes.Status, app.primary.attributes.RunningFor)
    })
  }

  async setup(location: string) {
    App.setup(this.name, location)
  }

  find(name: string): App | undefined {
    const app = this.apps().find(app => app.name == name)

    if (!app)
      return exit(1, `No app named '${name}@${this.name}' was found.`)

    return app
  }

  apps(): App[] {
    return Container.all(this.name)
      .map(container => App.find(this.name, container.name))
  }
}
