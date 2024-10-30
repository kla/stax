import { dumpOptions, importRegex, extendsRegex, rootExtendsRegex, anchorNamePrefix } from './index'
import { deepRemoveKeys, dig, exit, resolve, deepMapWithKeysAsync } from '~/utils'
import { parseTemplateExpression, expressionRegex } from './expressions'
import { ExpressionWarning } from './index'
import * as fs from 'fs'
import * as path from 'path'
import yaml from 'js-yaml'
import icons from '~/icons'
import Import from './import'

// global cache for now. later if needed this should be keyed on the parent yaml file
export const expressionsCache: Record<string, any> = {}

export async function loadFile(filePath: string, expressionCallback?: Function | undefined): Promise<Record<string, any>> {
  return await new YamlER(filePath, { expressionCallback }).load()
}

export function dump(obj: any): string {
  return yaml.dump(obj, dumpOptions)
}

export default class YamlER {
  public filePath: string
  public parentFile: string
  public rootFile: string
  public imports: Record<string, Import>
  public content: string
  public attributes: Record<string, any>
  public warnings: string[]
  private expressionCallback: Function | undefined

  constructor(filePath: string, options: { parentFile?: string, expressionCallback?: Function | undefined } = {}) {
    this.filePath = resolve(path.dirname(options.parentFile || filePath), filePath)
    this.parentFile = options.parentFile
    this.expressionCallback = options.expressionCallback
  }

  get baseDir(): string {
    return path.dirname(this.filePath)
  }

  // does not evaluate expressions
  compile(): Record<string, any> {
    this.warnings = []
    this.content = this.readFile(this.filePath)
    this.parseImports()
    this.parseExtends()
    this.attributes = yaml.load(this.content)
    this.attributes = deepRemoveKeys(this.attributes, [ new RegExp(`^${anchorNamePrefix}`) ])
    return this.attributes
  }

  async load(): Promise<Record<string, any>> {
    if (!this.attributes)
      this.compile()

    // only parse expressions on the final set of attributes
    if (!this.parentFile) {
      // expressions can return an expression or reference an attribute wiith an expression later in the
      // object that hasn't been evaluated yet so we parse expressions in a loop until there are no more
      const maxIterations = 100 // prevent infinite loops
      let iterations = 0

      while (await this.parseAllExpressions()) {
        if (++iterations >= maxIterations)
          throw new Error(`Maximum expression parsing iterations (${maxIterations}) exceeded. Possible circular reference in expressions.`)
      }
    }

    return this.attributes
  }

  dump(): string {
    return dump(this.attributes)
  }

  private readFile(filePath: string): string {
    try {
      return fs.readFileSync(filePath, 'utf8')
    } catch (error) {
      let message = `Could not import ${filePath}`
      if (this.parentFile) message += ` from ${this.parentFile}`
      console.error(`${icons.error} ${message} - ${error.code}: ${error.message}`)
      process.exit(1)
    }
  }

  private parseImports() {
    this.imports = {}
    this.content = this.content.replace(importRegex, (match, filePath, name) => {
      const yamlImport = new Import({ name, match, filePath, parentFile: this.filePath })
      this.imports[yamlImport.name] = yamlImport

      const attrs: any = yamlImport.compile()
      let text: string = dump({ [yamlImport.anchorName]: attrs })
      text = text.replace(`${yamlImport.anchorName}:`, `${yamlImport.anchorName}: &${yamlImport.name}`)
      return `# ${match}\n${text}`
    })
  }

  private parseExtends() {
    const prepends = new Set<string>()

    // root level !extends
    this.content = this.content.replace(rootExtendsRegex, (_match, name) => `<<: *${name}`)

    // non-root level !extends
    this.content = this.content.replace(extendsRegex, (_match, indent, key, name) => {
      if (name.includes('.')) {
        const imp = this.findImport(name)
        const subKey = name.split('.').slice(1).join('.')
        const extendedValue = dig(imp.yamler.attributes, subKey)

        if (extendedValue === undefined)
          exit(1, { message: `${icons.error} Invalid !extends reference: '${name}' in file '${this.filePath}'. The referenced field does not exist.` })

        let text = dump({ [name]: extendedValue }).replace(`${name}:`, `${imp.buildAnchorName(name)}: &${name}`)
        prepends.add(text)
      }
      return `${indent}${key}:\n${indent}  <<: *${name}`
    })

    if (prepends.size > 0)
      this.content = Array.from(prepends).join('\n\n') + '\n\n' + this.content
  }

  private getCacheKey(name: string, args: string[]): string {
    return `${name}:${JSON.stringify(args)}`
  }

  private async evaluateExpression(baseDir: string, attributes: Record<string, any>, path: string, name: string, args: string[]): Promise<any> {
    const cacheKey = this.getCacheKey(name, args)

    if (!(cacheKey in expressionsCache)) {
      try {
        expressionsCache[cacheKey] = await this.expressionCallback(baseDir, attributes, path, name, args)
      } catch (error) {
        if (error instanceof ExpressionWarning) {
          this.warnings.push(error.message)
          return undefined
        }
        throw error
      }
    }

    return expressionsCache[cacheKey]
  }

  public async parseExpression(path: string, obj: string | undefined | null): Promise<[any, boolean]> {
    if (!obj || typeof(obj) !== 'string') return [obj, false]

    const matches = obj.match(expressionRegex)
    if (!matches) return [obj, false]

    let result = obj
    for (const match of matches) {
      const expression = parseTemplateExpression(match)

      if (expression && this.expressionCallback) {
        const value = await this.evaluateExpression(this.baseDir, this.attributes, path, expression.name, expression.args)

        if (result == match)
          result = value // this maintains the type when the expression is not embedded in a string
        else
          result = result.replace(match, value)
      }
    }

    return [result, true]
  }

  private async parseAllExpressions() {
    let found = false

    this.attributes = await deepMapWithKeysAsync(this.attributes, async (path, key, value) => {
      const [newKey, keyHasExpression] = await this.parseExpression(path, key)
      let newValue

      found ||= keyHasExpression

      if (Array.isArray(value)) {
        const results = []

        for (const item of value)
          results.push(await this.parseExpression(path, item))

        newValue = results.map(([val]) => val)
        found ||= results.some(([_, hasExp]) => hasExp)
      } else {
        const [parsedValue, valueHasExpression] = await this.parseExpression(path, value)
        found ||= valueHasExpression
        newValue = parsedValue
      }

      return [newKey, newValue]
    })
    return found
  }

  private findImport(name: string): Import {
    const importName = name.split('.')[0]
    const imp = this.imports[importName] || exit(1, { message: `${icons.error} Couldn't find import for '${importName}' referenced in '${this.filePath}'` })
    return dig(imp.yamler.attributes, name.split('.')[1]) ? imp : null
  }
}
