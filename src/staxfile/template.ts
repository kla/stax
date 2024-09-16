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

export function renderTemplate(template: string, callback: (name: string, args: string[]) => string): string {
  return template.replace(/\$\{\{\s*([^}]+)\s*\}\}/g, (_, match) => {
    const [name, argString] = parseToken(match)
    const args = parseTemplateExpressionArgs(argString)
    return callback(name, args)
  })
}
