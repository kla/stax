import { dasherize, dig, resolve } from '~/utils'
import { ExpressionWarning } from '~/yamler'
import icons from '~/icons'
import Staxfile from '.'
import inquirer from 'inquirer'

export default class Evaluator {
  public staxfile: Staxfile

  constructor(staxfile: Staxfile) {
    this.staxfile = staxfile
  }

  async evaluate(baseDir: string, attributes: Record<string, any>, path: string, name: string, args: string[]) {
    args = args.map(arg => typeof arg === 'string' && arg.startsWith('stax.') ? this.fetch(attributes, arg) : arg)

    // TODO: remove the stax. prefix
    if (name === 'stax.ssh_auth_sock' || name === 'ssh_auth_sock') return '/run/host-services/ssh-auth.sock'

    if (name.startsWith('stax.')) return this.fetch(attributes, name)
    if (name === 'read') return this.read(args[0], args[1])
    if (name === 'mount_workspace') return this.mountWorkspace()
    if (name === 'mount_ssh_auth_sock') return this.mountSshAuthSock()
    if (name === 'resolve' || name === 'resolve_relative') return resolve(baseDir, args[0])
    if (name === 'user') return process.env.USER || ''
    if (name === 'user_id') return process.getuid()
    if (name === 'dasherize') return dasherize(args[0])
    if (name === 'prompt') return await this.prompt(args[0], args[1])
    if (name === 'requires?') return this.staxfile.config.requires.includes(args[0])
    if (name === 'test') return this.test(args[0], args[1]).toString()

    throw new ExpressionWarning(`Invalid template expression: ${name}`)
  }

  fetch(attributes: Record<string, any>, path: string): string {
    return dig(attributes, path, { required: true })
  }

  platform(): string {
    return process.platform
  }

  mountSshAuthSock(): string {
    return this.platform() === 'darwin' ?
      '/run/host-services/ssh-auth.sock:/run/host-services/ssh-auth.sock' :
      `${process.env.STAX_HOST_SERVICES}:/run/host-services`
  }

  mountWorkspace(): string {
    const src = this.staxfile.config.location.local ? this.staxfile.config.source : this.staxfile.config.workspace_volume
    const dest = this.staxfile.config.workspace
    return `${src}:${dest}`
  }

  read(file: string, defaultValue: string=''): string {
    try {
      return this.staxfile.location.readSync(file)?.trim() || defaultValue
    } catch (e) {
      const url = this.staxfile.config.location?.baseUrl
      console.warn(`${icons.warning} Couldn't read ${file} from ${url}: ${e.code}... using default value of '${defaultValue}'`)
      return defaultValue
    }
  }

  async prompt(message: string, defaultValue: string): Promise<string> {
    const response = await inquirer.prompt([
      {
        type: 'input',
        name: 'result',
        message,
        default: defaultValue,
      },
    ])
    return response.result
  }

  test(filename: string, pattern: string): boolean {
    const content = this.read(filename, '')

    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      const regex = new RegExp(pattern.slice(1, -1))
      return regex.test(content)
    }
    return content.includes(pattern)
  }
}
