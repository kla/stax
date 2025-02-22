import { exit } from '~/utils'
import { FindContainerOptions, StaxConfig } from '~/types'
import App from '~/app'
import Container from '~/container'
import settings from '~/settings'
import list from '~/app_list'

export default class Stax {
  public context: string

  constructor(context: string) {
    this.context = context
  }

  list(options: { fields?: string[], full?: boolean, app?: string } = {}) {
    list(this.apps(), options)
  }

  async setup(config: StaxConfig, options: { inspect?: boolean } = { inspect: false }): Promise<App> {
    return await App.setup({ context: this.context, ...config } as unknown as StaxConfig, options)
  }

  find(appName: string): App | undefined {
    appName = settings.read('aliases', {})[appName] || appName
    const app = this.apps().find(app => app.name == appName)

    if (!app)
      return exit(1, { message: `No app named '${appName}@${this.context}' was found.` })

    return app
  }

  findContainer(appName: string, options: FindContainerOptions): Container {
    return this.find(appName).findContainer(options)
  }

  apps(): App[] {
    return App.all(this.context)
  }
}
