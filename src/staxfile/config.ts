import { existsSync } from 'fs'
import { isDirectory, fileExists, verifyExists, resolve, truthy } from '~/utils'
import { StaxConfig } from '~/types'
import { exit } from '~/utils'
import Location from '~/location'
import icons from '~/icons'

export default class Config implements StaxConfig {
  public context!: string
  public app!: string
  public staxfile!: string
  public source!: string
  public workspace!: string
  public workspace_volume!: string
  public vars!: Record<string, string>
  public after_setup!: string
  public before_up!: string
  public after_down!: string
  public requires!: string[]

  constructor(config: StaxConfig | Record<string, string> | undefined = undefined) {
    this.requires = []
    if (config)
      this.update(config)
  }

  /**
   * Gets the Location object for the current source.
   * @returns {Location} A Location instance representing the source.
   */
  get location(): Location { return Location.from(this.context, this.app, this.source) }

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
    if (path.startsWith('stax.'))
      path = path.substring(5)

    return path.split('.').reduce((acc, key) => acc && acc[key], this)
  }

  public set(path: string, value: any) {
    if (path.startsWith('stax.'))
      path = path.substring(5)

    const keys = path.split('.')
    let current: any = this

    if (!Object.prototype.hasOwnProperty.call(this, keys[0]))
      return

    if (keys[0] === 'requires' && typeof value === 'string')
      value = JSON.parse(value)

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]

      if (!(key in current) || current[key] === null || current[key] === undefined) {
        current[key] = {}
      } else if (typeof current[key] !== 'object') {
        console.warn(`${icons.warning}  Cannot set '${path}': '${keys.slice(0, i + 1).join('.')}' is not an object`)
        return
      }
      current = current[key]
    }

    const lastKey = keys[keys.length - 1]

    if (lastKey === 'app' && !this.isValidAppName(value))
      return exit(1, { message: `${icons.warning} App name can only contain alphanumeric characters, dashes, and underscores: ${value}` })

    if (lastKey in current &&
        current[lastKey] !== null &&
        current[lastKey] !== undefined &&
        typeof current[lastKey] !== 'object' &&
        typeof value === 'object') {
    } else
      current[lastKey] = value
  }

  public filterRequires() {
    const mapped = this.requires.map(item => ({
      name: typeof(item) === 'string' ? item : item['name'],
      if: item['if'] === undefined ? true : truthy(item['if'])
    }))
    return this.requires = mapped.filter(item => item.if).map(item => item.name)
  }

  private update(config: StaxConfig): boolean {
    Object.keys(config).forEach((key) => this.set(key, config[key]))

    if (!this.staxfile && !(this.staxfile = this.findStaxfile(this.source)))
      return exit(1, { message: `Could not find a Staxfile at ${this.source}` })

    if (!existsSync(this.staxfile)) {
      console.warn(`${icons.warning}  Staxfile missing for ${this.app}: ${this.staxfile}`)
      return false
    } else
      this.staxfile = resolve(this.staxfile)

    if (!this.app)
      this.app = this.location.basename.replace(/\.staxfile$/, '')

    if (!Location.isGitUrl(this.source))
      verifyExists(this.source = resolve(this.source))

    return true
  }

  private findStaxfile(path): string {
    if (isDirectory(path)) {
      const files = [ 'Staxfile', 'compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml' ].map(file => `${path}/${file}`)
      path = files.find(file => fileExists(file))
    }
    return path
  }

  private isValidAppName(name: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(name)
  }
}
