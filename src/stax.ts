import { exit } from '~/utils'
import { FindContainerOptions, StaxConfig } from '~/types'
import App from '~/app'
import Container from '~/container'
import settings from '~/settings'
import list from '~/app_list'
import path from 'path'
import icons from '~/icons'

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

  deduceAppName(appName: string): string {
    if (!appName) {
      const dir = path.basename(process.env.STAX_APP_DIR || process.cwd())

      if (this.apps().find(app => app.name == dir))
        appName = dir

      if (!appName)
        return exit(1, { message: `${icons.failed} Please specify an app name or navigate to an app directory.` })
    }
    return appName
  }

  findContainer(appName: string, options: FindContainerOptions): Container {
    if (!appName)
      appName = this.deduceAppName(appName)

    return this.find(appName).findContainer(options)
  }

  apps(): App[] {
    return App.all(this.context)
  }
}
