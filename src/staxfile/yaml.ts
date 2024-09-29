import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import icons from '~/icons'

const dumpOptions = { lineWidth: -1, noRefs: true }

interface ImportStatement {
  filePath: string
  alias: string
}

function parseImportStatements(content: string): ImportStatement[] {
  const importRegex = /^@import (.+) as (.+)/gm
  const matches = [...content.matchAll(importRegex)]
  return matches.map(match => ({ filePath: match[1], alias: match[2] }))
}

function insertAnchors(content: string, imports: ImportStatement[], baseDir: string, parentFile: string): string {
  let result = content

  imports.forEach(({ filePath, alias }) => {
    const absolutePath = path.resolve(baseDir, filePath)

    try {
      let yamlContent = fs.readFileSync(absolutePath, 'utf8')
      const nestedImportStatements = parseImportStatements(yamlContent)

      if (nestedImportStatements.length > 0)
        yamlContent = insertAnchors(yamlContent, nestedImportStatements, path.dirname(absolutePath), absolutePath)

      const anchorName = `stax_import_${alias}`
      const anchorContent = yaml.dump({ [anchorName]: yaml.load(yamlContent) }, dumpOptions).replace(`${anchorName}:`, `${anchorName}: &${alias}`)
      result = result.replace(`@import ${filePath} as ${alias}`, anchorContent)
    } catch (error) {
      console.error(`${icons.error} Could not import ${absolutePath} from ${parentFile} - ${error.code}: ${error.message}`)
      process.exit(1)
    }
  })
  return result
}

function stripStaxImports(obj: any): any {
  if (Array.isArray(obj))
    return obj.map(stripStaxImports)

  if (obj && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      if (!key.startsWith('stax_import_'))
        acc[key] = stripStaxImports(obj[key])

      return acc
    }, {} as any)
  }
  return obj
}

export function loadFile(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf8')
  const importStatements = parseImportStatements(content)
  const baseDir = path.dirname(filePath)
  let processedContent = insertAnchors(content, importStatements, baseDir, filePath)
  let previousContent

  do {
    previousContent = processedContent
    const nestedImportStatements = parseImportStatements(processedContent)
    processedContent = insertAnchors(processedContent, nestedImportStatements, baseDir, filePath)
  } while (processedContent !== previousContent)

  return stripStaxImports(yaml.load(processedContent))
}

export function dump(obj: any): string {
  return yaml.dump(obj, dumpOptions)
}
