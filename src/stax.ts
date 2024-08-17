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
      app.containers.forEach((container) => {
        const icon = container.state == 'running' ? '🟢' : '⚫'
        console.log(icon, container.name, container.state, container.uptime, container.id)
      })
    })
  }

  async setup(location: string) {
    App.setup(this.name, location)
  }

  find(appName: string): App | undefined {
    const app = this.apps().find(app => app.name == appName)

    if (!app)
      return exit(1, `No app named '${appName}@${this.name}' was found.`)

    return app
  }

  apps(): App[] {
    return App.all(this.name)
  }
}
