import { exit } from '~/utils'
import { StaxfileOptions } from './staxfile'
import App from '~/app'

export default class Stax {
  public contextName: string

  constructor(contextName: string) {
    this.contextName = contextName
  }

  list() {
    this.apps().forEach((app) => {
      app.containers.forEach((container) => {
        const icon = container.state == 'running' ? '🟢' : '⚫'
        console.log(icon, container.name, container.state, container.uptime, container.id)
      })
    })
  }

  async setup(options: StaxfileOptions) {
    App.setup({ contextName: this.contextName, ...options })
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
