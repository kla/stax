import { exit } from '~/utils'
import { StaxfileOptions } from '~/types'
import App from '~/app'

export default class Stax {
  public context: string

  constructor(context: string) {
    this.context = context
  }

  list() {
    this.apps().forEach((app) => {
      app.containers.forEach((container) => {
        const icon = container.state == 'running' ? '🟢' : '⚫'
        console.log(icon, container.name, container.state, container.uptime, container.id)
      })
    })
  }

  async setup(config: StaxfileOptions, options: { inspect?: boolean } = { inspect: false }) {
    App.setup({ context: this.context, ...config }, options)
  }

  find(appName: string): App | undefined {
    const app = this.apps().find(app => app.name == appName)

    if (!app)
      return exit(1, `No app named '${appName}@${this.context}' was found.`)

    return app
  }

  apps(): App[] {
    return App.all(this.context)
  }
}
