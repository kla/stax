import Container from './container'

export default class Hooks {
  public container: Container

  constructor(container: Container) {
    this.container = container
  }

  onPostBuild() {
    this.container.features.forEach((feature) => {
      this.log('[onPostBuild]', 'Installing', feature.name)
    })
  }

  log(message: string, ...args: any[]) {
    if (args?.length > 0)
      message = `${message} ${args.join(' ')}`

    console.log(`[${this.container.name}@${this.container.projectName}] ${message}`)
  }
}
