import { existsSync, statSync } from 'fs'
import { capture } from '~/shell'
import { confirm as inquirerConfirm } from '@inquirer/prompts'
import tmp from 'tmp'
import icons from './icons'
import yaml from 'js-yaml'
import chalk from 'chalk'
import * as path from 'path'
import * as os from 'os'

/**
 * Terminates the process with a specified exit code and optional error message.
 *
 * @param code - The exit code to use when terminating the process.
 * @param options - Optional configuration object.
 * @param options.message - Custom error message to display before exiting.
 * @param options.trace - If true, displays a shortened stack trace (up to 6 lines).
 *
 * @example
 * // Exit with code 1 and a custom message
 * exit(1, { message: 'An error occurred' });
 *
 * @example
 * // Exit with code 2 and display a short stack trace
 * exit(2, { message: 'Critical error', trace: true });
 */
export function exit(code: number, options?: { message?: string; trace?: boolean }): never {
  const error = new Error(options?.message)

  if (options?.trace) {
    const stackLines = error.stack.split('\n')
    const shortTrace = stackLines.slice(0, 6).join('\n')
    console.error(shortTrace)
  } else
    console[code != 0 ? 'error' : 'info'](error.message)

  process.exit(code)
}

/**
 * Checks if the given path is a directory.
 * @param path - The path to check.
 * @returns True if the path is a directory, false otherwise.
 */
export function isDirectory(path: string) {
  return directoryExists(path)
}

/**
 * Checks if the given path is a file.
 * @param path - The path to check.
 * @returns True if the path is a file, false otherwise.
 */
export function isFile(path: string) {
  try {
    return statSync(path).isFile()
  } catch (err) {
    return false
  }
}

/**
 * Checks if a file exists at the given path.
 * @param file - The file path to check.
 * @returns True if the file exists, false otherwise.
 */
export function fileExists(file) {
  return existsSync(file)
}

/**
 * Verifies if a file exists and exits the process if it doesn't.
 * @param file - The file path to verify.
 * @param message - Optional custom error message.
 * @returns True if the file exists.
 */
export function verifyFile(file: string, message: string = undefined): boolean {
  if (fileExists(file))
      return true

  if (!message)
    message = 'File not found'

  exit(1, { message: `${icons.warning}  ${message}: ${file}`, trace: !message })
}

/**
 * Verifies if a directory exists and exits the process if it doesn't.
 * @param dir - The directory path to verify.
 * @param message - Optional custom error message.
 * @returns True if the directory exists.
 */
export function verifyDirectory(dir: string, message?: string): boolean {
  if (directoryExists(dir))
    return true

  if (isFile(dir))
    exit(1, { message: `${icons.warning}  Expected a directory but found a file: ${dir}`, trace: !message })

  if (!message)
    message = 'Directory not found'

  exit(1, { message: `${icons.warning}  ${message}: ${dir}`, trace: !message })
}

export function verifyExists(path: string, message?: string): boolean {
  return verifyFile(path, message) || verifyDirectory(path, message)
}

/**
 * Checks if a directory exists at the given path.
 * @param path - The directory path to check.
 * @returns True if the directory exists, false otherwise.
 */
export function directoryExists(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

/**
 * Recursively removes specified keys from an object or array.
 * @param obj - The object or array to process.
 * @param keysToRemove - An array of keys to remove.
 * @returns A new object or array with the specified keys removed.
 */
export function deepRemoveKeys(obj: any, keysToRemove: (string | RegExp)[]): any {
  if (typeof obj !== 'object' || obj === null)
    return obj

  if (Array.isArray(obj))
    return obj.map(item => deepRemoveKeys(item, keysToRemove))

  return Object.fromEntries(
    Object.entries(obj)
      .filter(([key]) => !keysToRemove.some(pattern => typeof pattern === 'string' ? pattern === key : pattern.test(key)))
      .map(([key, value]) => [key, deepRemoveKeys(value, keysToRemove)])
  )
}

/**
 * Creates a temporary file in the specified directory.
 * @param dir - The directory to create the temporary file in.
 * @param postfix - The postfix for the temporary file name.
 * @returns The path of the created temporary file.
 */
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

/**
 * Parses and removes wildcard options from an array of arguments.
 * @param args - The array of arguments to process.
 * @param startsWith - The prefix that identifies wildcard options.
 * @returns A tuple containing the filtered arguments and an object of parsed options.
 */
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

/**
 * Pretty prints an object as a colored YAML-like structure.
 * @param object - The object to pretty print.
 */
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

/**
 * Converts a string to kebab-case.
 * @param str - The string to convert.
 * @returns The kebab-cased string.
 */
export function dasherize(str: string): string {
  return str
    ?.replace(/([a-z])([A-Z])/g, '$1-$2')
    ?.replace(/[\s_]+/g, '-')
    ?.toLowerCase()
}

/**
 * Generates a cache directory path for a given context and app.
 * @param context - The context for the cache.
 * @param app - The app name.
 * @returns The path to the cache directory.
 */
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

export function truthy(value: any): boolean {
  if (typeof value === 'string') return value.toLowerCase() !== 'false' && value !== '0' && value !== ''
  if (Array.isArray(value)) return value.length > 0
  return !!value
}

/**
 * Retrieves a value from an object using a dot-notated path.
 * @param obj - The object to dig into.
 * @param path - The dot-notated path to the desired value.
 * @param options - Configuration options
 * @param options.required - If true, throws an error when path is not found
 * @param options.default - Value to return if path is not found
 * @returns The value at the specified path, undefined if not found and no default provided
 * @throws {Error} If path is not found and required is true
 */
export function dig(obj: any, path: string, options: { required?: boolean, default?: any } = { required: false }): any {
  if (path === '.') return obj

  const value = path.split('.')
    .reduce((acc, part) => (acc && typeof acc === 'object' && part in acc) ? acc[part] : undefined, obj)

  if (value === undefined) {
    if (options.default) return options.default
    if (options.required) throw new Error(`Required path "${path}" not found in object`)
  }

  return value
}

/**
 * Converts a duration in milliseconds to a human-readable string representation.
 *
 * @param milliseconds - The duration in milliseconds to convert.
 * @returns A string representing the duration in days, hours, minutes, and seconds.
 *
 * @example
 * // Returns "2d 3h 45m 30s"
 * timeAgo(189930000)
 *
 * @example
 * // Returns "1h 30m 0s"
 * timeAgo(5400000)
 *
 * @example
 * // Returns "45s"
 * timeAgo(45000)
 */
export function timeAgo(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

/**
 * Returns the value if it's present, otherwise returns null.
 * A value is considered present if it's not null, undefined, an empty string, or an empty array.
 *
 * @param value - The value to check for presence.
 * @returns The value if it's present, null otherwise.
 *
 * @example
 * presence('hello')  // Returns 'hello'
 * presence('')       // Returns null
 * presence([1, 2])   // Returns [1, 2]
 * presence([])       // Returns null
 * presence(0)        // Returns 0
 * presence(null)     // Returns null
 * presence(undefined) // Returns null
 */
export function presence<T>(value: T): T | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && value.trim() === '') return null
  if (Array.isArray(value) && value.length === 0) return null
  return value
}

/**
 * Resolves a file path, expanding the tilde character if present,
 * and then applies path.resolve with any additional path segments.
 *
 * @param paths - The path segments to resolve.
 * @returns The resolved absolute path.
 */
export function resolve(...paths: string[]): string {
  const [firstPath, ...restPaths] = paths
  let resolvedPath = firstPath

  if (firstPath.startsWith('~'))
    resolvedPath = path.join(os.homedir(), firstPath.slice(1))

  return path.resolve(resolvedPath, ...restPaths)
}

/**
 * Async version of deepMapWithKeys that supports async callbacks
 */
export async function deepMapWithKeysAsync(
  obj: Record<string, any>,
  callback: (path: string, key: string, value: any) => Promise<[string, any]>,
  path: string = ''
): Promise<Record<string, any>> {
  const entries: [string, any][] = []

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key
    const [newKey, newValue] = await callback(currentPath, key, value)

    if (Array.isArray(newValue)) {
      const processedArray = []

      for (let index = 0; index < newValue.length; index++) {
        const item = newValue[index]
        const arrayPath = `${currentPath}.${index}`

        if (typeof item === 'object' && item !== null) {
          await callback(arrayPath, index.toString(), item)
          processedArray.push(await deepMapWithKeysAsync(item, callback, arrayPath))
        } else
          processedArray.push(item)
      }

      entries.push([newKey, processedArray])
    } else if (typeof newValue === 'object' && newValue !== null)
      entries.push([newKey, await deepMapWithKeysAsync(newValue, callback, currentPath)])
    else
      entries.push([newKey, newValue])
  }
  return Object.fromEntries(entries)
}

export function deepMapWithKeys(
  obj: Record<string, any>,
  callback: (path: string, key: string, value: any) => [string, any],
  path: string = ''
): Record<string, any> {
  const entries = Object.entries(obj).map(([key, value]) => {
    const currentPath = path ? `${path}.${key}` : key
    const [newKey, newValue] = callback(currentPath, key, value)

    if (Array.isArray(newValue)) {
      return [newKey, newValue.map((item, index) => {
        const arrayPath = `${currentPath}.${index}`

        if (typeof item === 'object' && item !== null) {
          callback(arrayPath, index.toString(), item)
          return deepMapWithKeys(item, callback, arrayPath)
        }
        return item
      })]
    }

    if (typeof newValue === 'object' && newValue !== null)
      return [newKey, deepMapWithKeys(newValue, callback, currentPath)]

    return [newKey, newValue]
  })

  return Object.fromEntries(entries)
}

export function requireDockerVersion(minDockerVersion: number, minComposeVersion: number) {
  const dockerVersion = capture('docker version --format "{{.Server.Version}}"').trim()
  const [dockerMajor, dockerMinor] = (dockerVersion || '').split('.')

  if (!dockerVersion || parseFloat(`${dockerMajor}.${dockerMinor}`) < minDockerVersion)
    return exit(1, { message: `Docker version >= ${minDockerVersion} required. Found: ${dockerVersion || 'not installed'}` })

  const composeVersion = capture('docker compose version --short').trim()
  const [composeMajor, composeMinor] = (composeVersion || '').split('.')

  if (!composeVersion ||
      parseFloat(`${composeMajor}.${composeMinor}`) < minComposeVersion)

  return exit(1, { message: `Docker Compose version >=${minComposeVersion}.0 required. Found: ${composeVersion || 'not installed'}` })
}

/**
 * Removes null, undefined, empty arrays, and empty objects from an object
 * @param obj - The object to clean
 * @returns A new object with empty values removed
 */
export function compact(arr: any[]): any[] {
  return arr.filter(value => value != null && !(Array.isArray(value) && value.length === 0) && value !== '')
}

export async function confirm(message: string, defaultAnswer: boolean = false): Promise<boolean> {
  return await inquirerConfirm({ message, default: defaultAnswer })
}
