import { exit } from '~/utils'
import tmp from 'tmp'
import App from '~/app'

export default class Stax {
  public contextName: string

  constructor(contextName: string) {
    this.contextName = contextName
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
    App.setup(this.contextName, location)
  }

  find(appName: string): App | undefined {
    const app = this.apps().find(app => app.name == appName)

    if (!app)
      return exit(1, `No app named '${appName}@${this.contextName}' was found.`)

    return app
  }

  apps(): App[] {
    return App.all(this.contextName)
  }
}
