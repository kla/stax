import { dasherize } from '~/utils'
import * as path from 'path'
import Staxfile from './index'

export default class Expressions {
  private staxfile: Staxfile
  private static cache: Record<string, any> = {}

  constructor(staxfile: Staxfile) {
    this.staxfile = staxfile
  }

  evaluate(name: string, args: any[]): any {
    const cacheKey = this.getCacheKey(name, args)
    if (!name.startsWith('stax.') && Expressions.cache[cacheKey] !== undefined) {
      console.log(`Cache hit for ${cacheKey}: ${Expressions.cache[cacheKey]}`)
      return Expressions.cache[cacheKey]
    }

    const result = this.evaluateUncached(name, args)
    Expressions.cache[cacheKey] = result
    return result
  }

  private evaluateUncached(name: string, args: any[]): any {
    args = args.map(arg => typeof arg === 'string' && arg.startsWith('stax.') ? this.fetchConfigValue(arg) : arg)

    if (name.startsWith('stax.')) return this.fetchConfigValue(name)
    if (name === 'read') return this.read(args[0], args[1])
    if (name === 'mount_workspace') return this.mountWorkspace()
    if (name === 'mount_ssh_auth_sock') return this.mountSshAuthSock()
    if (name === 'resolve') return path.resolve(args[0])
    if (name === 'user') return process.env.USER || ''
    if (name === 'user_id') return process.getuid().toString()
    if (name === 'dasherize') return dasherize(args[0])
    if (name === 'test') return this.test(args[0], args[1])

    this.staxfile.warnings.add(`Invalid template expression: ${name}`)
  }

  private getCacheKey(name: string, args: any[]): string {
    return `${this.staxfile.context}:${this.staxfile.app}:${name}:${JSON.stringify(args)}`
  }

  private fetchConfigValue(name: string): string {
    const key = name.slice(5) // strip 'stax.' prefix

    if (key === 'host_services')
      return process.env.STAX_HOST_SERVICES || ''

    if (key === 'ssh_auth_sock')
      return '/run/host-services/ssh-auth.sock'

    if (!this.staxfile.config.hasProperty(key)) {
      if (name === 'config.workspace_volume' && !this.staxfile.location.local)
        this.staxfile.warnings.add(`A '${name}' name must be defined when setting up from a remote source.`)

      this.staxfile.warnings.add(`Undefined reference to '${name}'`)
    }

    return this.staxfile.config.fetch(key)
  }

  private read(file: string, defaultValue: string): string {
    try {
      return (this.staxfile.location.readSync(file) || defaultValue).trim()
    } catch (e) {
      console.warn(`Couldn't read ${file}: ${e.code}... using default value of '${defaultValue}'`)
      return defaultValue
    }
  }

  private mountWorkspace(): string {
    const src = this.staxfile.config.location.local ? this.staxfile.config.source : this.staxfile.config.workspace_volume
    const dest = this.staxfile.config.workspace
    return `${src}:${dest}`
  }

  private mountSshAuthSock(): string {
    return process.platform === 'darwin' ?
      '${{ stax.ssh_auth_sock }}:${{ stax.ssh_auth_sock }}' :
      '${{ stax.host_services }}:/run/host-services'
  }

  private test(filename: string, pattern: string): boolean {
    const content = this.read(filename, '')
    const regex = new RegExp(pattern)
    return regex.test(content)
  }
}
