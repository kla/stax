import { existsSync, statSync } from 'fs'
import tmp from 'tmp'

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
    exit(1, (message || 'File not found') + `: ${file}`)
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

export function flattenObject(obj, prefix = '') {
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
      const [key, value] = arg.slice(startsWith.length).split('=')
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
