import { dumpOptions, importRegex, extendsRegex, rootExtendsRegex, anchorNamePrefix, EvaluationContext } from './index'
import { deepRemoveKeys, dig, exit, resolve, deepMapWithKeysAsync } from '~/utils'
import { ExpressionWarning } from './index'
import { replaceEachSymbol, symbolizer, symbols } from './symbolizer'
import * as fs from 'fs'
import * as path from 'path'
import yaml from 'js-yaml'
import icons from '~/icons'
import Import from './import'

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
  public symbols: Record<string, any>
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
    this.symbols = {}
    this.warnings = []
    this.content = this.readFile(this.filePath)
    this.parseImports()
    this.parseExtends()
    this.attributes = yaml.load(this.content)
    this.attributes = deepRemoveKeys(this.attributes, [ new RegExp(`^${anchorNamePrefix}`) ])
    this.attributes = symbolizer(this.filePath, this.attributes, this.symbols)

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

      while (await this.evaluateSymbols()) {
        if (++iterations >= maxIterations)
          throw new Error(`Maximum expression parsing iterations (${maxIterations}) exceeded. Possible circular reference in expressions.`)

        // re-symbolize in case an expression returns another expression
        // TODO: this can probably be optimized
        this.attributes = symbolizer(this.filePath, this.attributes, this.symbols)
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
      this.symbols = { ...this.symbols, ...yamlImport.yamler.symbols }

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

  private async evaluateExpression(context): Promise<any> {
    try {
      return await this.expressionCallback(context)
    } catch (error) {
      if (error instanceof ExpressionWarning) {
        this.warnings.push(error.message)
        return undefined
      }
      throw error
    }
  }

  public getSymbols(value: any) {
    return symbols(value).map(symbol => this.symbols[symbol])
  }

  public async replaceSymbols(path: string, stringValue: any): Promise<[any, boolean]> {
    let symbols = 0
    let result = await replaceEachSymbol(stringValue, async (match, uuid) => {
      const symbol = this.symbols[uuid]

      if (symbol && this.expressionCallback) {
        const context: EvaluationContext = {
          baseDir: this.baseDir,
          attributes: this.attributes,
          path: path,
          symbol: symbol,
          name: symbol.name,
          args: symbol.args,
        }
        symbols++
        return await this.evaluateExpression(context)
      }
      return match
    })
    return [ result, symbols > 0 ]
  }

  private async evaluateSymbols() {
    let found = false

    this.attributes = await deepMapWithKeysAsync(this.attributes, async (path, key, value) => {
      const [newKey, keyHasExpression] = await this.replaceSymbols(path, key)
      let newValue

      found ||= keyHasExpression

      if (Array.isArray(value)) {
        const results = []

        for (const item of value)
          results.push(await this.replaceSymbols(path, item))

        newValue = results.map(([val]) => val)
        found ||= results.some(([_, hasExp]) => hasExp)
      } else {
        const [parsedValue, valueHasExpression] = await this.replaceSymbols(path, value)
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
