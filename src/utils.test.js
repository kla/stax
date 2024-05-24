import { csvKeyValuePairs, directoryExists, isFile } from './utils'

describe('csvKeyValuePairs', () => {
  it('returns an empty object for an empty string', () => {
    expect(csvKeyValuePairs('')).toEqual({})
  })

  it('returns an empty object for undefined input', () => {
    expect(csvKeyValuePairs()).toEqual({})
  })

  it('parses a single key-value pair', () => {
    expect(csvKeyValuePairs('key=value')).toEqual({ key: 'value' })
  })

  it('parses multiple key-value pairs', () => {
    expect(csvKeyValuePairs('key1=value1,key2=value2')).toEqual({
      key1: 'value1',
      key2: 'value2',
    })
  })

  it('handles empty values', () => {
    expect(csvKeyValuePairs('key1=,key2=')).toEqual({ key1: '', key2: '' })
  })

  it('handles keys without values', () => {
    expect(csvKeyValuePairs('key1,key2')).toEqual({ key1: undefined, key2: undefined })
  })

  it('handles duplicate keys', () => {
    expect(csvKeyValuePairs('key=value1,key=value2')).toEqual({ key: 'value2' })
  })

  it('sorts the keys alphabetically', () => {
    expect(csvKeyValuePairs('key2=value2,key1=value1')).toEqual({
      key1: 'value1',
      key2: 'value2',
    })
  })
})

describe('isFile', () => {
  it('returns true for an existing file', () => {
    expect(isFile(__filename)).toBe(true)
  })

  it('returns false for a non-existing file', () => {
    expect(isFile('/path/to/non-existing/file.txt')).toBe(false)
  })

  it('returns false for a directory', () => {
    expect(isFile('/path/to/directory')).toBe(false)
  })

  it('returns false for an invalid path', () => {
    expect(isFile('/invalid/path')).toBe(false)
  })
})

describe('directoryExists', () => {
  it('should return true if the directory exists', () => {
    expect(directoryExists(__dirname)).toBe(true)
  })

  it('should return false if the directory does not exist', () => {
    expect(directoryExists('/path/to/nonexistent/directory')).toBe(false)
  })
})
