import * as fs from 'fs'
import * as path from 'path'
import yaml from 'js-yaml'
import icons from '~/icons'

const dumpOptions = { lineWidth: -1, noRefs: true }
const extendsRegex = /^(\s*)(.+):\s*!extends\s+(.+)$/gm
const rootExtendsRegex = /^!extends\s+(.+)$/gm

interface Import {
  name: string
  filePath: string
}

function stripStaxImports(obj: any): any {
  if (Array.isArray(obj))
    return obj.map(stripStaxImports)

  if (obj && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      if (!key.startsWith('_stax_import_'))
        acc[key] = stripStaxImports(obj[key])

      return acc
    }, {} as any)
  }
  return obj
}

export function readYamlFile(filePath: string, parentFile: string = undefined): string {
  try {
    let { imports, content } = parseExtends(fs.readFileSync(filePath, 'utf8'), path.dirname(filePath))

    imports.forEach((item) => {
      const importContent = { [item.name]: yaml.load(readYamlFile(item.filePath, filePath)) }
      content = dump(importContent).replace(`${item.name}:`, `${item.name}: &${item.name}`) + '\n' + content
    })
    return dump(stripStaxImports(yaml.load(content)))
  } catch (error) {
    let message = `Could not import ${filePath}`
    if (parentFile) message += ` from ${parentFile}`
    console.error(`${icons.error} ${message} - ${error.code}: ${error.message}`)
    process.exit(1)
  }
}

function parseExtends(content: string, baseDir: string): { imports: Import[], content: string } {
  const imports: Import[] = []

  // Handle root level !extends
  content = content.replace(rootExtendsRegex, (_match, name) => {
    const sanitizedName = makeImportAnchorName(name)
    imports.push({ name: sanitizedName, filePath: path.resolve(baseDir, name) })
    return `<<: *${sanitizedName}`
  })

  // Handle non-root level !extends
  const parsedContent: string = content.replace(extendsRegex, (_match, indent, key, name) => {
    const sanitizedName = makeImportAnchorName(name)
    imports.push({ name: sanitizedName, filePath: path.resolve(baseDir, name) })
    return `${indent}${key}:\n${indent}  <<: *${sanitizedName}`
  })

  return { imports, content: parsedContent }
}

function makeImportAnchorName(name: string): string {
  return '_stax_import_' + name.replace(/[^a-zA-Z0-9_]/g, '_')
}

export function loadFile(filePath: string): string {
  return yaml.load(readYamlFile(filePath))
}

export function dump(obj: any): string {
  return yaml.dump(obj, dumpOptions)
}
