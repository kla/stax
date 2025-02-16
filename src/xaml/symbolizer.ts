import { deepMapWithKeys } from '~/utils'
import { expressionRegex } from './expressions'
import { parseTemplateExpression } from './expressions'

export const symbolRegex = /@@stax:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})@@/g

export function symbolizer(file: string, attributes: Record<string, any>, symbols: Record<string, any>): Record<string, any> {
  return deepMapWithKeys(attributes, (_path, key, value) => {
    return Array.isArray(value) ?
      [ symbolize(file, symbols, key), value.map(item => symbolize(file, symbols, item)) ] :
      [ symbolize(file, symbols, key), symbolize(file, symbols, value) ]
  })
}

function symbolize(file: string, symbols: Record<string, any>, value: any): any {
  if (!value || typeof(value) !== 'string') return value

  const matches = value.match(expressionRegex)
  if (!matches) return value

  let result = value
  for (const match of matches) {
    const expression = parseTemplateExpression(match)

    if (expression) {
      const uuid = crypto.randomUUID()
      value = `@@stax:${uuid}@@`
      symbols[uuid] = { expression: match, file: file, ...expression }

      if (result == match)
        result = value
      else
        result = result.replace(match, value)
    }
  }
  return result
}

export function symbols(string: string) {
  if (!string || typeof(string) !== 'string')
    return []

  return Array.from(string.matchAll(symbolRegex)).map(match => match[1])
}

export async function replaceEachSymbol(string: string, callback: (match: string, uuid: string) => Promise<any>): Promise<any> {
  if (!string || typeof(string) !== 'string')
    return string

  const matches = Array.from(string.matchAll(symbolRegex))
  if (!matches.length) return string

  if (matches.length === 1 && matches[0][0] === string)
    return await callback(matches[0][0], matches[0][1])

  let result = string
  for (const [match, uuid] of matches) {
    const replacement = await callback(match, uuid)
    result = result.replace(match, replacement === undefined ? 'undefined' : replacement?.toString() ?? 'null')
  }

  return result
}
