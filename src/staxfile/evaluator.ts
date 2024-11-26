import { dasherize, dig, resolve, fileExists } from '~/utils'
import { EvaluationContext, ExpressionWarning } from '~/yamler'
import { symbolRegex } from '~/yamler/symbolizer'
import { dirname } from 'path'
import icons from '~/icons'
import settings from '~/settings'
import Staxfile from '.'
import inquirer from 'inquirer'

export const evaluatorCache = new Map<string, any>()

export default class Evaluator {
  public staxfile: Staxfile

  constructor(staxfile: Staxfile) {
    this.staxfile = staxfile
  }

  private getCacheKey(name: string, args: string[]): string {
    return `${this.staxfile.staxfile}:${name}:${JSON.stringify(args)}`
  }

  async evaluate(context: EvaluationContext) {
    const key = this.getCacheKey(context.name, context.args)

    if (!evaluatorCache.has(key)) {
      const value = await this.evaluateWithoutCache(context)

      // don't cache expressions that returned a symbol
      if (typeof(value) === 'string' && value.match(symbolRegex))
        return value

      evaluatorCache.set(key, value)
    }
    return evaluatorCache.get(key)
  }

  parseArgs(context: EvaluationContext): string[] {
    return context.args.map((arg) => {
      if (typeof arg === 'string') {
        if (arg.startsWith('stax.'))
          return this.fetch(context.attributes, arg)

        // Replace \b\$app\b with (?:^|\W)\$app(?:$|\W) to better handle $ character
        arg = arg.replace(/(?:^|\W)\$app(?:$|\W)/g, (match) => {
          const prefix = match.charAt(0) === '$' ? '' : match.charAt(0)
          const suffix = match.charAt(match.length - 1) === '$' ? '' : match.charAt(match.length - 1)
          return `${prefix}${this.staxfile.config.app}${suffix}`
        })
        arg = settings.interpolate(arg)
      }
      return arg
    })
  }

  async evaluateWithoutCache(context: EvaluationContext) {
    const name = context.name
    const args = this.parseArgs(context)

    if (name === 'ssh_auth_sock') return '/run/host-services/ssh-auth.sock'

    if (name.startsWith('stax.')) return this.fetch(context.attributes, name)
    if (name === 'read') return this.read(args[0], args[1])
    if (name === 'mount_workspace') return this.mountWorkspace()
    if (name === 'mount_ssh_auth_sock') return this.mountSshAuthSock()
    if (name === 'resolve') return resolve(context.baseDir, args[0])
    if (name === 'resolve_relative') return this.resolveRelative(context.symbol.file, args[0], { nullIfMissing: false })
    if (name === 'resolve_relative?') return this.resolveRelative(context.symbol.file, args[0], { nullIfMissing: true })
    if (name === 'user') return process.env.USER || ''
    if (name === 'user_id') return process.getuid()
    if (name === 'dasherize') return dasherize(args[0])
    if (name === 'prompt') return await this.prompt(args[0], args[1])
    if (name === 'requires?') return this.staxfile.config.requires.includes(args[0])
    if (name === 'test') return this.test(args[0], args[1])
    if (name === 'setting') return settings.read(args[0])

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

  resolveRelative(file: string, path: string, { nullIfMissing = false } = {}) {
    const resolvedPath = resolve(dirname(file), path)
    return nullIfMissing ? (fileExists(resolvedPath) ? resolvedPath : null) : resolvedPath
  }
}
