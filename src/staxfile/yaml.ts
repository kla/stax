import * as fs from 'fs'
import * as path from 'path'
import yaml from 'js-yaml'
import icons from '~/icons'
import { deepRemoveKeys } from '~/utils'

const dumpOptions = { lineWidth: -1, noRefs: true }
const sanitizeRegex = /[^a-zA-Z0-9_]/g
const importRegex = /^!import\s+(.+)\sas\s+(.+)$/gm
const extendsRegex = /^(\s*)(.+):\s*!extends\s+(.+)$/gm
const rootExtendsRegex = /^!extends\s+(.+)$/gm

class Import {
  public match: string
  public name: string
  public filePath: string

  constructor({ match, name, filePath }: { match: string, name: string, filePath: string }) {
    this.match = match
    this.name = name
    this.filePath = filePath
  }

  get anchorName(): string {
    return [
      '_stax_import',
      this.filePath.replace(sanitizeRegex, '_'),
      this.name.replace(sanitizeRegex, '_')
    ].join('_')
  }
}

class Yaml {
  public filePath: string
  public parentFile: string
  public imports: Record<string, Import>

  constructor(filePath: string, parentFile: string = undefined) {
    this.filePath = path.resolve(path.dirname(parentFile || filePath), filePath)
    this.parentFile = parentFile
  }

  get baseDir(): string {
    return path.dirname(this.filePath)
  }

  compile(): string {
    let content = this.readFile(this.filePath)

    this.imports = {}
    content = this.parseImports(content)
    content = this.parseExtends(content)
    return deepRemoveKeys(yaml.load(content), Object.values(this.imports).map(item => item.anchorName))
  }

  load(): any {
    return this.compile()
  }

  dump(): string {
    return dump(this.load())
  }

  readFile(filePath: string): string {
    try {
      return fs.readFileSync(filePath, 'utf8')
    } catch (error) {
      let message = `Could not import ${filePath}`
      if (this.parentFile) message += ` from ${this.parentFile}`
      console.error(`${icons.error} ${message} - ${error.code}: ${error.message}`)
      process.exit(1)
    }
  }

  parseImports(content: string): string {
    return content.replace(importRegex, (match, filePath, name) => {
      const yamlImport = new Import({ name, match, filePath })
      this.imports[yamlImport.name] = yamlImport

      const data: any = new Yaml(yamlImport.filePath, this.filePath).compile()
      let text: string = dump({ [yamlImport.anchorName]: data })
      text = text.replace(`${yamlImport.anchorName}:`, `${yamlImport.anchorName}: &${yamlImport.name}`)
      return `# ${match}\n${text}`
    })
  }

  parseExtends(content: string): string {
    content = content.replace(rootExtendsRegex, (_match, name) => `<<: *${name}`) // root level !extends
    content = content.replace(extendsRegex, (_match, indent, key, name) => `${indent}${key}:\n${indent}  <<: *${name}`) // non-root level !extends
    return content
  }
}

export function loadFile(filePath: string): string {
  return new Yaml(filePath).load()
}

export function dump(obj: any): string {
  return yaml.dump(obj, dumpOptions)
}
