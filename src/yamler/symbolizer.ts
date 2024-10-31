import { deepMapWithKeys } from '~/utils'
import { expressionRegex } from './expressions'
import { parseTemplateExpression } from './expressions'

export const symbolRegex = /@@stax:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})@@/g

export function symbolizer(attributes: Record<string, any>, symbols: Record<string, any>): Record<string, any> {
  return deepMapWithKeys(attributes, (_path, key, value) => {
    return [symbolize(symbols, key), symbolize(symbols, value)]
  })
}

function symbolize(symbols: Record<string, any>, value: any): any {
  if (!value || typeof(value) !== 'string') return value

  const matches = value.match(expressionRegex)
  if (!matches) return value

  let result = value
  for (const match of matches) {
    const expression = parseTemplateExpression(match)

    if (expression) {
      const uuid = crypto.randomUUID()
      value = `@@stax:${uuid}@@`
      symbols[uuid] = expression

      if (result == match)
        result = value
      else
        result = result.replace(match, value)
    }
  }
  return result
}
