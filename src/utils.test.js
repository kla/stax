import { csvKeyValuePairs } from './utils'

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
