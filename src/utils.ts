import { statSync } from 'fs'

// Parses a CSV string into a key/value object (e.g. "a=b,c=d" => { a: "b", c: "d" })
export function csvKeyValuePairs(csv: string = '') {
  return (csv || '').trim().split(',').sort().reduce((labels, label) => {
    const [key, value] = label.trim().split(/ *= */, 2)
    labels[key] = value
    return labels
  }, {})
}

export function exit(code: number, message: string | undefined=undefined) {
  if (message)
    console.error(message)

  process.exit(code)
}

export function isFile(path: string) {
  try {
    return statSync(path).isFile()
  } catch (err) {
    return false
  }
}
