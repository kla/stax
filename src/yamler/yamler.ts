import { dumpOptions, importRegex, extendsRegex, rootExtendsRegex, anchorNamePrefix } from './index'
import { deepRemoveKeys, dig, exit, resolve } from '~/utils'
import * as fs from 'fs'
import * as path from 'path'
import yaml from 'js-yaml'
import icons from '~/icons'
import Import from './import'

export function loadFile(filePath: string): Record<string, any> {
  return new YamlER(filePath).load()
}

export function dump(obj: any): string {
  return yaml.dump(obj, dumpOptions)
}

export default class YamlER {
  public filePath: string
  public parentFile: string
  public imports: Record<string, Import>
  public content: string
  public attributes: Record<string, any>

  constructor(filePath: string, options: { parentFile?: string } = {}) {
    this.filePath = resolve(path.dirname(options.parentFile || filePath), filePath)
    this.parentFile = options.parentFile
  }

  get baseDir(): string {
    return path.dirname(this.filePath)
  }

  compile(): Record<string, any> {
    this.content = this.readFile(this.filePath)
    this.parseImports()
    this.parseExtends()
    this.parseResolveRelative()
    return this.attributes = deepRemoveKeys(yaml.load(this.content), [ new RegExp(`^${anchorNamePrefix}`) ])
  }

  load(): Record<string, any> {
    return this.compile()
  }

  dump(): string {
    return dump(this.load())
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

      const attrs: any = yamlImport.yaml.compile()
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
        const extendedValue = dig(imp.yaml.attributes, subKey)

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

  private findImport(name: string): Import {
    const importName = name.split('.')[0]
    const imp = this.imports[importName] || exit(1, { message: `${icons.error} Couldn't find import for '${importName}' referenced in '${this.filePath}'` })
    return dig(imp.yaml.attributes, name.split('.')[1]) ? imp : null
  }

  // Need to handle resolve_relative here rather than in Expressions because we know
  // the actual paths here when importing
  private parseResolveRelative() {
    this.content = this.content.replace(/\$\{\{ resolve_relative (.+?) \}\}/g, (_match, p1) => resolve(this.baseDir, p1))
  }
}
