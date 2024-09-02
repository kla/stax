import { csvKeyValuePairs, deepRemoveKeys, directoryExists, flattenObject, getNonNullProperties, isFile } from '~/utils'

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

describe('deepRemoveKeys', () => {
  it('removes keys from a simple object', () => {
    const input = { a: 1, b: 2, c: 3 }
    const result = deepRemoveKeys(input, ['b'])
    expect(result).toEqual({ a: 1, c: 3 })
  })

  it('removes multiple keys from a simple object', () => {
    const input = { a: 1, b: 2, c: 3, d: 4 }
    const result = deepRemoveKeys(input, ['b', 'd'])
    expect(result).toEqual({ a: 1, c: 3 })
  })

  it('removes keys from nested objects', () => {
    const input = {
      a: 1,
      b: {
        c: 2,
        d: {
          e: 3,
          f: 4
        }
      },
      g: 5
    }
    const result = deepRemoveKeys(input, ['c', 'f'])
    expect(result).toEqual({
      a: 1,
      b: {
        d: {
          e: 3
        }
      },
      g: 5
    })
  })

  it('removes keys from arrays of objects', () => {
    const input = [
      { a: 1, b: 2 },
      { c: 3, d: 4 }
    ]
    const result = deepRemoveKeys(input, ['b', 'c'])
    expect(result).toEqual([
      { a: 1 },
      { d: 4 }
    ])
  })

  describe('handling edge cases', () => {
    it('handles non-object inputs', () => {
      expect(deepRemoveKeys(5, ['a'])).toBe(5)
      expect(deepRemoveKeys('string', ['a'])).toBe('string')
      expect(deepRemoveKeys(null, ['a'])).toBe(null)
    })

    it('does not modify the original object', () => {
      const input = { a: 1, b: { c: 2, d: 3 } }
      const result = deepRemoveKeys(input, ['c'])
      expect(input).toEqual({ a: 1, b: { c: 2, d: 3 } })
      expect(result).toEqual({ a: 1, b: { d: 3 } })
    })

    it('handles empty array of keys to remove', () => {
      const input = { a: 1, b: 2 }
      const result = deepRemoveKeys(input, [])
      expect(result).toEqual({ a: 1, b: 2 })
    })

    it('handles keys that do not exist in the object', () => {
      const input = { a: 1, b: 2 }
      const result = deepRemoveKeys(input, ['c', 'd'])
      expect(result).toEqual({ a: 1, b: 2 })
    })
  })
})

describe('getNonNullProperties', () => {
  it('should remove null and undefined properties', () => {
    const input = {
      a: 1,
      b: null,
      c: undefined,
      d: 'string'
    }
    const expected = {
      a: 1,
      d: 'string'
    }
    expect(getNonNullProperties(input)).toEqual(expected)
  })

  it('should handle nested objects', () => {
    const input = {
      a: 1,
      b: {
        c: null,
        d: 2,
        e: {
          f: undefined,
          g: 3
        }
      }
    }
    const expected = {
      a: 1,
      b: {
        d: 2,
        e: {
          g: 3
        }
      }
    }
    expect(getNonNullProperties(input)).toEqual(expected)
  })

  it('should return an empty object for all null/undefined properties', () => {
    const input = {
      a: null,
      b: undefined,
      c: {
        d: null,
        e: undefined
      }
    }
    expect(getNonNullProperties(input)).toEqual({})
  })

  it('should handle arrays', () => {
    const input = {
      a: [1, null, 3],
      b: null,
      c: [{ d: null, e: 4 }]
    }
    expect(getNonNullProperties(input)).toEqual({ a: input.a, c: input.c})
  })

  it('should return the same object if no null/undefined properties', () => {
    const input = {
      a: 1,
      b: 'string',
      c: { d: 2 }
    }
    expect(getNonNullProperties(input)).toEqual(input)
  })
})

describe('flattenObject', () => {
  it('flattens a simple object', () => {
    const input = { a: 1, b: 2 }
    const expected = { a: 1, b: 2 }
    expect(flattenObject(input)).toEqual(expected)
  })

  it('flattens a nested object', () => {
    const input = { a: 1, b: { c: 2, d: 3 } }
    const expected = { a: 1, 'b.c': 2, 'b.d': 3 }
    expect(flattenObject(input)).toEqual(expected)
  })

  it('flattens a deeply nested object', () => {
    const input = { a: 1, b: { c: { d: 2 } }, e: 3 }
    const expected = { a: 1, 'b.c.d': 2, e: 3 }
    expect(flattenObject(input)).toEqual(expected)
  })

  it('handles arrays', () => {
    const input = { a: [1, 2, 3], b: { c: [4, 5] } }
    const expected = { a: [1, 2, 3], 'b.c': [4, 5] }
    expect(flattenObject(input)).toEqual(expected)
  })

  it('handles null values', () => {
    const input = { a: null, b: { c: null } }
    const expected = { a: null, 'b.c': null }
    expect(flattenObject(input)).toEqual(expected)
  })

  it('handles empty objects', () => {
    const input = { a: {}, b: { c: {} } }
    const expected = {}
    expect(flattenObject(input)).toEqual(expected)
  })

  it('uses custom prefix', () => {
    const input = { a: 1, b: { c: 2 } }
    const expected = { 'prefix.a': 1, 'prefix.b.c': 2 }
    expect(flattenObject(input, 'prefix')).toEqual(expected)
  })

  it('flattens objects with numeric keys', () => {
    const input = { a: { 0: 'zero', 1: 'one' }, b: 2 }
    const expected = { 'a.0': 'zero', 'a.1': 'one', b: 2 }
    expect(flattenObject(input)).toEqual(expected)
  })

  it('handles undefined values', () => {
    const input = { a: undefined, b: { c: undefined } }
    const expected = { a: undefined, 'b.c': undefined }
    expect(flattenObject(input)).toEqual(expected)
  })

  it('flattens objects with special characters in keys', () => {
    const input = { 'a.b': 1, 'c-d': { 'e f': 2 } }
    const expected = { 'a.b': 1, 'c-d.e f': 2 }
    expect(flattenObject(input)).toEqual(expected)
  })

  // it('returns an empty object for non-object input', () => {
  //   expect(flattenObject(null)).toEqual({})
  //   expect(flattenObject(undefined)).toEqual({})
  //   expect(flattenObject(42)).toEqual({})
  //   expect(flattenObject('string')).toEqual({})
  //   expect(flattenObject(true)).toEqual({})
  // })
})

describe('flattenObject', () => {
  it('should flatten a simple object', () => {
    const input = { a: 1, b: 2 }
    const expected = { a: 1, b: 2 }
    expect(flattenObject(input)).toEqual(expected)
  })

  it('should flatten a nested object', () => {
    const input = { a: 1, b: { c: 2, d: 3 } }
    const expected = { a: 1, 'b.c': 2, 'b.d': 3 }
    expect(flattenObject(input)).toEqual(expected)
  })

  it('should flatten a deeply nested object', () => {
    const input = { a: 1, b: { c: { d: 2 } }, e: 3 }
    const expected = { a: 1, 'b.c.d': 2, e: 3 }
    expect(flattenObject(input)).toEqual(expected)
  })

  it('should handle arrays', () => {
    const input = { a: [1, 2, 3], b: { c: [4, 5] } }
    const expected = { a: [1, 2, 3], 'b.c': [4, 5] }
    expect(flattenObject(input)).toEqual(expected)
  })

  it('should handle null values', () => {
    const input = { a: null, b: { c: null } }
    const expected = { a: null, 'b.c': null }
    expect(flattenObject(input)).toEqual(expected)
  })

  it('should handle empty objects', () => {
    const input = { a: {}, b: { c: {} } }
    const expected = {}
    expect(flattenObject(input)).toEqual(expected)
  })

  it('should use custom prefix', () => {
    const input = { a: 1, b: { c: 2 } }
    const expected = { 'prefix.a': 1, 'prefix.b.c': 2 }
    expect(flattenObject(input, 'prefix')).toEqual(expected)
  })
})
