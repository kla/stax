function parseToken(content: string): [string, string[]] {
  const parts = content.trim().split(/\s+/)
  if (parts.length === 0) return [content, []]

  const [name, ...args] = parts
  return [name, args]
}

function renderTemplate(template: string, callback: (name: string, args: string[]) => string): string {
  return template.replace(/\$\{\{\s*([^}]+)\s*\}\}/g, (match, content) => {
    const [name, args] = parseToken(content.trim())
    return callback(name, args)
  })
}

export { renderTemplate }
