import { exit } from '~/utils'
import { StaxConfig } from '~/types'
import App from '~/app'
import settings from '~/settings'

export default class Stax {
  public context: string

  constructor(context: string) {
    this.context = context
  }

  list() {
    this.apps().forEach((app) => {
      app.containers.forEach((container) => {
        const icon = container.state == 'running' ? '🟢' : '⚫'
        const sourceIcon = container.config.location.local ? '📂' : '🛜 '
        console.log(icon, container.name, container.state, container.uptime, container.id,
          `${sourceIcon}${container.config.source}`
        )
      })
    })
  }

  async setup(config: StaxConfig, options: { inspect?: boolean } = { inspect: false }) {
    App.setup({ context: this.context, ...config } as unknown as StaxConfig, options)
  }

  find(appName: string): App | undefined {
    appName = settings.read('aliases')[appName] || appName
    const app = this.apps().find(app => app.name == appName)

    if (!app)
      return exit(1, `No app named '${appName}@${this.context}' was found.`)

    return app
  }

  apps(): App[] {
    return App.all(this.context)
  }
}
