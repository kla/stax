function parseToken(content: string): [string, string[]] {
  const parts = content.trim().split(/\s+/)
  if (parts.length === 0) return [content, []]

  const [name, ...args] = parts
  return [name, args]
}

/**
 * Parses an array of template expression arguments, handling quoted strings.
 *
 * @param args - The array of arguments to parse.
 * @returns An array of parsed arguments, with quoted strings combined.
 */
function parseTemplateExpressionArgs(args: string[]): string[] {
  if (!Array.isArray(args)) return args

  const parsedArgs: string[] = []
  let currentArg = ''
  let inQuotes = false

  for (const arg of args) {
    if (!inQuotes) {
      if (arg.startsWith("'") && arg.endsWith("'")) {
        parsedArgs.push(arg.slice(1, -1).trim())
      } else if (arg.startsWith("'")) {
        inQuotes = true
        currentArg = arg.slice(1)
      } else {
        parsedArgs.push(arg.trim())
      }
    } else {
      if (arg.endsWith("'")) {
        inQuotes = false
        currentArg += ' ' + arg.slice(0, -1)
        parsedArgs.push(currentArg.trim())
        currentArg = ''
      } else {
        currentArg += ' ' + arg
      }
    }
  }

  if (currentArg) {
    parsedArgs.push(currentArg.trim())
  }

  return parsedArgs
}

/**
 * Parses a template expression and returns the function name and arguments.
 *
 * @param expression - The template expression to parse.
 * @returns An object containing the function name and parsed arguments.
 */
export function parseTemplateExpression(expression: string): { funcName: string; args: string[] } {
  const [content] = expression.match(/\$\{\{\s*([^}]+)\s*\}\}/) || []
  if (!content) {
    throw new Error('Invalid template expression')
  }

  const [funcName, argString] = parseToken(content.slice(3, -2).trim())
  const args = parseTemplateExpressionArgs(argString)

  return { funcName, args }
}

export async function renderTemplate(template: string, callback: (name: string, args: string[], originalMatch: string) => Promise<string>): Promise<string> {
  const regex = /\$\{\{\s*([^}]+)\s*\}\}/g
  let result = ''
  let lastIndex = 0
  let match

  while ((match = regex.exec(template)) !== null) {
    const before = template.slice(lastIndex, match.index)
    result += before

    const { funcName, args } = parseTemplateExpression(match[0])
    const replacement = await callback(funcName, args, match[0])

    result += replacement
    lastIndex = regex.lastIndex
  }

  result += template.slice(lastIndex)
  return result
}
