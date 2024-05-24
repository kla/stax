export default class Feature {
  public name: string
  public options: Record<string, any>

  constructor(name: string, options: Record<string, any>) {
    this.name = name
    this.options = options
  }

  install() {
    console.log(`🚀 Installing ${this.name} feature...`)
  }
}
