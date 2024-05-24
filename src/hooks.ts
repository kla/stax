import Container from './container'

export default class Hooks {
  public container: Container

  constructor(container: Container) {
    this.container = container
  }

  onPostBuild() {
    this.log('onPostBuild', 'features:', this.container.features.map(f => f.name).join(','))
  }

  log(message: string, ...args: any[]) {
    if (args?.length > 0)
      message = `${message} ${args.join(' ')}`

    console.log(`[${this.container.name}@${this.container.projectName}] ${message}`)
  }
}
