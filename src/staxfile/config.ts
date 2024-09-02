import { isDirectory, fileExists, verifyFile } from '~/utils'
import { StaxConfig } from '~/types'
import { exit } from '~/utils'
import Location from '~/location'
import path from 'path'

export default class Config implements StaxConfig {
  public context!: string
  public app!: string
  public staxfile!: string
  public source!: string
  public workspace!: string
  public workspace_volume!: string
  public vars!: Record<string, string>

  constructor(config: StaxConfig | undefined = undefined) {
    if (config)
      this.update(config)
  }

  /**
   * Gets the Location object for the current source.
   * @returns {Location} A Location instance representing the source.
   */
  get location(): Location { return Location.from(this.source) }

  public hasProperty(path: string): boolean {
    if (!path) return false

    const keys = path.split('.')
    let current = this

    for (const key of keys) {
      if (typeof current !== 'object' || !current.hasOwnProperty(key))
        return false

      current = current[key]
    }
    return true
  }

  public fetch(path: string) {
    return path.split('.').reduce((acc, key) => acc && acc[key], this)
  }

  public set(path: string, value: any) {
    if (path.startsWith('stax.'))
      path = path.substring(5)

    const keys = path.split('.')
    let current: any = this

    // Check if the root property is valid
    if (!Object.prototype.hasOwnProperty.call(this, keys[0])) {
      console.warn(`⚠️  Ignoring invalid config property '${keys[0]}'`)
      return
    }

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]

      if (!(key in current) || current[key] === null || current[key] === undefined) {
        current[key] = {}
      } else if (typeof current[key] !== 'object') {
        console.warn(`⚠️  Cannot set '${path}': '${keys.slice(0, i + 1).join('.')}' is not an object`)
        return
      }
      current = current[key]
    }

    const lastKey = keys[keys.length - 1]

    if (lastKey in current &&
        current[lastKey] !== null &&
        current[lastKey] !== undefined &&
        typeof current[lastKey] !== 'object' &&
        typeof value === 'object') {
    } else
      current[lastKey] = value
  }

  private update(config: StaxConfig) {
    Object.keys(config).forEach((key) => this.set(key, config[key]))

    if (!this.staxfile && !(this.staxfile = this.findStaxfile(this.source)))
      exit(1, `Could not find a Staxfile at ${this.source}`)

    verifyFile(this.staxfile)
    this.source = this.location.source // so we get the path.resolve version if it is a local dir
    this.staxfile = path.resolve(this.staxfile)

    if (!this.app)
      this.app = this.location.basename
}

  private findStaxfile(path): string {
    if (isDirectory(path)) {
      const files = [ 'Staxfile', 'compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml' ].map(file => `${path}/${file}`)
      path = files.find(file => fileExists(file))
    }
    return path
  }
}
