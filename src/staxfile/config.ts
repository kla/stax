import { isDirectory, fileExists, verifyFile } from '~/utils'
import { StaxfileOptions } from '~/types'
import path from 'path'

export default class Config implements StaxfileOptions {
  public context: string
  public source: string
  public staxfile: string
  public app: string

  constructor(config: StaxfileOptions) {
    Object.keys(config).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(config, key))
        this[key] = config[key]
    })

    if (!this.staxfile)
      this.staxfile = this.findStaxfile(this.source)

    if (!this.app)
      this.app = path.basename(this.source)

    verifyFile(this.staxfile, `Staxfile not found: ${this.staxfile}`)
    this.source = path.resolve(this.source)
    this.staxfile = path.resolve(this.staxfile)
  }

  private findStaxfile(path): string {
    if (isDirectory(path)) {
      const files = [ 'Staxfile', 'compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml' ].map(file => `${path}/${file}`)
      path = files.find(file => fileExists(file))
    }
    return path
  }
}
