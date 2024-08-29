import Container from '~/container'

export default class Hooks {
  public container: Container

  constructor(container: Container) {
    this.container = container
  }

  onPostBuild() {
  }

  log(message: string, ...args: any[]) {
    if (args?.length > 0)
      message = `${message} ${args.join(' ')}`

    console.log(`[${this.container.name}@${this.container.context}] ${message}`)
  }
}
