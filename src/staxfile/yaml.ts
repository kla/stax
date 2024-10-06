import * as fs from 'fs'
import * as path from 'path'
import yaml from 'js-yaml'
import icons from '~/icons'
import { deepRemoveKeys, dig, exit } from '~/utils'

const dumpOptions = { lineWidth: -1, noRefs: true }
const sanitizeRegex = /[^a-zA-Z0-9_]/g
const importRegex = /^ *!import\s+(.+)\sas\s+(.+)$/gm
const extendsRegex = /^(\s*)(.+):\s*!extends\s+(.+)$/gm
const rootExtendsRegex = /^ *!extends\s+(.+)$/gm
const anchorNamePrefix = '_stax_import_'

class Import {
  public match: string
  public name: string
  public filePath: string
  public yaml: Yaml

  constructor({ match, name, filePath, parentFile }: { match: string, name: string, filePath: string, parentFile: string }) {
    this.match = match
    this.name = name
    this.filePath = filePath
    this.yaml = new Yaml(filePath, parentFile)
  }

  get anchorName(): string {
    return this.buildAnchorName([ this.filePath, this.yaml.parentFile, this.name ])
  }

  buildAnchorName(parts: string | string[]): string {
    if (typeof parts === 'string') parts = [ parts ]
    return [ anchorNamePrefix, ...parts.map(part => part.replace(sanitizeRegex, '_')) ].join('_')
  }
}

class Yaml {
  public filePath: string
  public parentFile: string
  public imports: Record<string, Import>
  public content: string
  public attributes: Record<string, any>

  constructor(filePath: string, parentFile: string = undefined) {
    this.filePath = path.resolve(path.dirname(parentFile || filePath), filePath)
    this.parentFile = parentFile
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
        let text = dump({ [name]: dig(imp.yaml.attributes, subKey) }).replace(`${name}:`, `${imp.buildAnchorName(name)}: &${name}`)
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
    this.content = this.content.replace(/\$\{\{ resolve_relative (.+?) \}\}/g, (_match, p1) => path.resolve(this.baseDir, p1))
  }
}

export function loadFile(filePath: string): Record<string, any> {
  return new Yaml(filePath).load()
}

export function dump(obj: any): string {
  return yaml.dump(obj, dumpOptions)
}
