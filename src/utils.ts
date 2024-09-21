import { existsSync, statSync } from 'fs'
import tmp from 'tmp'
import icons from './icons'
import yaml from 'js-yaml'
import chalk from 'chalk'
import * as path from 'path'

// Parses a CSV string into a key/value object (e.g. "a=b,c=d" => { a: "b", c: "d" })
export function csvKeyValuePairs(csv: string = '') {
  return (csv || '').trim().split(',').sort().reduce((labels, label) => {
    const [key, value] = label.trim().split(/ *= */, 2)
    labels[key] = value
    return labels
  }, {})
}

export function exit(code: number, message: string | undefined=undefined): undefined {
  if (message)
    console.error(message)

  process.exit(code)
}

export function isDirectory(path: string) {
  return directoryExists(path)
}

export function isFile(path: string) {
  try {
    return statSync(path).isFile()
  } catch (err) {
    return false
  }
}

export function fileExists(file) {
  return existsSync(file)
}

export function verifyFile(file: string, message: string = undefined): boolean {
  if (!fileExists(file))
    exit(1, icons.warning + '  ' + (message || 'File not found') + `: ${file}`)
  return true
}

export function directoryExists(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

export function deepRemoveKeys(obj, keysToRemove) {
  if (typeof obj !== 'object' || obj === null)
    return obj

  if (Array.isArray(obj))
    return obj.map(item => deepRemoveKeys(item, keysToRemove))

  return Object.fromEntries(
    Object.entries(obj)
      .filter(([key]) => !keysToRemove.includes(key))
      .map(([key, value]) => [key, deepRemoveKeys(value, keysToRemove)])
  )
}

export function makeTempFile(dir, postfix): string {
  return tmp.fileSync({ tmpdir: dir, postfix }).name
}

/**
 * Flattens a nested object into a single-level object with dot-notation keys.
 *
 * @param obj - The object to flatten.
 * @param prefix - The prefix to use for the flattened keys (used for recursion).
 * @returns A new object with flattened key-value pairs.
 *
 * @example
 * const nested = { a: { b: 1, c: { d: 2 } }, e: 3 };
 * const flattened = flattenObject(nested);
 * // Result: { 'a.b': 1, 'a.c.d': 2, 'e': 3 }
 */
export function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, any> {
  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + '.' : ''

    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k]))
      Object.assign(acc, flattenObject(obj[k], pre + k))
    else
      acc[pre + k] = obj[k]

    return acc
  }, {})
}

export function parseAndRemoveWildcardOptions(args: string[], startsWith: string): [string[], Record<string, string>] {
  const staxVars: Record<string, string> = {}
  const filteredArgs = args.filter(arg => {
    if (arg.startsWith(startsWith)) {
      const [key, value] = arg.slice(2).split('=')
      staxVars[key] = value
      return false
    }
    return true
  } )
  return [ filteredArgs, staxVars]
}

export function getNonNullProperties(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue

    if (typeof value === 'object' && !Array.isArray(value)) {
      const nestedNonNull = getNonNullProperties(value)
      if (Object.keys(nestedNonNull).length > 0) {
        result[key] = nestedNonNull
      }
    } else {
      result[key] = value
    }
  }

  return result
}

export function pp(object) {
  const yamlString = yaml.dump(object, { lineWidth: -1 })
  const lines = yamlString.split('\n')
  let currentIndent = 0

  const coloredLines = lines.map(line => {
    const match = line.match(/^(\s*)(\S+):(.*)$/)
    if (match) {
      const [, indent, key, value] = match
      currentIndent = indent.length
      const bar = chalk.gray('│ ').repeat(currentIndent / 2)
      return `${bar}${chalk.cyan(key)}${chalk.gray(':')}${value}`
    } else {
      const bar = chalk.gray('│ ').repeat((currentIndent + 2) / 2)
      return `${bar}${line.trim()}`
    }
  })
  console.log(coloredLines.slice(0, coloredLines.length-1).join('\n'))
}

export function dasherize(str: string): string {
  return str
    ?.replace(/([a-z])([A-Z])/g, '$1-$2')
    ?.replace(/[\s_]+/g, '-')
    ?.toLowerCase()
}

export function cacheDir(context: string, app: string) {
  return path.join(process.env.STAX_HOME, 'cache', context, app)
}

/**
 * Parses an array of template expression arguments, handling quoted strings.
 *
 * @param args - The array of arguments to parse.
 * @returns An array of parsed arguments, with quoted strings combined.
 */
export function parseTemplateExpressionArgs(args: string[]): string[] {
  if (!Array.isArray(args)) return args

  const parsedArgs: string[] = []
  let currentArg = ''
  let inQuotes = false

  for (const arg of args) {
    if (!inQuotes) {
      if (arg.startsWith("'") && arg.endsWith("'")) {
        parsedArgs.push(arg.slice(1, -1))
      } else if (arg.startsWith("'")) {
        inQuotes = true
        currentArg = arg.slice(1)
      } else {
        parsedArgs.push(arg)
      }
    } else {
      if (arg.endsWith("'")) {
        inQuotes = false
        currentArg += ' ' + arg.slice(0, -1)
        parsedArgs.push(currentArg)
        currentArg = ''
      } else {
        currentArg += ' ' + arg
      }
    }
  }

  if (currentArg) {
    parsedArgs.push(currentArg)
  }

  return parsedArgs
}
