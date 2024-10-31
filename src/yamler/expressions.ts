export const expressionRegex = /\$\{\{\s*([^}]+)\s*\}\}/g

const SINGLE_QUOTE = "'"
const DOUBLE_QUOTE = '"'
const ESCAPE = '\\'
const SPACE = ' '

type ExpressionArgs = string[]

function parseToken(content: string): [string, ExpressionArgs] {
  const trimmed = content.trim()
  const [name, ...args] = trimmed.split(/\s(.+)/)
  return [name, args]
}

function parseTemplateExpressionArgs(args: ExpressionArgs): ExpressionArgs {
  if (!Array.isArray(args) || args.length === 0) return args

  const input = args[0]
  const result: string[] = []
  let currentArg = ''
  let inQuotes = false
  let quoteChar: typeof SINGLE_QUOTE | typeof DOUBLE_QUOTE | null = null
  let isEscaped = false

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (isEscaped) {
      currentArg += char
      isEscaped = false
      continue
    }

    if (char === ESCAPE) {
      isEscaped = true
      continue
    }

    if ((char === SINGLE_QUOTE || char === DOUBLE_QUOTE) && !isEscaped) {
      if (inQuotes && char === quoteChar) {
        result.push(currentArg)
        currentArg = ''
        inQuotes = false
        quoteChar = null
      } else if (!inQuotes) {
        if (currentArg.trim()) result.push(currentArg.trim())
        currentArg = ''
        inQuotes = true
        quoteChar = char
      } else {
        // Different quote type inside quotes, treat as normal character
        currentArg += char
      }
      continue
    }

    if (inQuotes) {
      currentArg += char
    } else if (char === SPACE) {
      if (currentArg.trim()) result.push(currentArg.trim())
      currentArg = ''
    } else {
      currentArg += char
    }
  }

  if (currentArg.trim()) result.push(currentArg.trim())

  return result
}

export function parseTemplateExpression(expression: string): { name: string; args: ExpressionArgs } | undefined {
  const [content] = expression.match(expressionRegex) || []
  if (!content) return undefined

  const [name, argString] = parseToken(content.slice(3, -2).trim())
  const args = parseTemplateExpressionArgs(argString)

  return { name, args }
}
