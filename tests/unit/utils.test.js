import { csvKeyValuePairs, dasherize, deepRemoveKeys, dig, directoryExists, flattenObject, isFile, truthy } from '~/utils'

describe('csvKeyValuePairs', () => {
  it('returns an empty object for an empty string', () => expect(csvKeyValuePairs('')).toEqual({}))
  it('returns an empty object for undefined input', () => expect(csvKeyValuePairs()).toEqual({}))
  it('parses a single key-value pair', () => expect(csvKeyValuePairs('key=value')).toEqual({ key: 'value' }))

  it('parses multiple key-value pairs', () => {
    expect(csvKeyValuePairs('key1=value1,key2=value2')).toEqual({
      key1: 'value1',
      key2: 'value2',
    })
  })

  it('handles empty values', () => expect(csvKeyValuePairs('key1=,key2=')).toEqual({ key1: '', key2: '' }))
  it('handles keys without values', () => expect(csvKeyValuePairs('key1,key2')).toEqual({ key1: undefined, key2: undefined }))
  it('handles duplicate keys', () => expect(csvKeyValuePairs('key=value1,key=value2')).toEqual({ key: 'value2' }))

  it('sorts the keys alphabetically', () => {
    expect(csvKeyValuePairs('key2=value2,key1=value1')).toEqual({
      key1: 'value1',
      key2: 'value2',
    })
  })
})

describe('isFile', () => {
  it('returns true for an existing file', () => expect(isFile(__filename)).toBe(true))
  it('returns false for a non-existing file', () => expect(isFile('/path/to/non-existing/file.txt')).toBe(false))
  it('returns false for a directory', () => expect(isFile('/path/to/directory')).toBe(false))
  it('returns false for an invalid path', () => expect(isFile('/invalid/path')).toBe(false))
})

describe('directoryExists', () => {
  it('should return true if the directory exists', () => expect(directoryExists(__dirname)).toBe(true))
  it('should return false if the directory does not exist', () => expect(directoryExists('/path/to/nonexistent/directory')).toBe(false))
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

  it('removes keys using both strings and regular expressions', () => {
    const input = {
      a: 1,
      b: 2,
      test1: 3,
      test2: 4,
      nested: {
        c: 5,
        test3: 6,
        deepNested: {
          d: 7,
          test4: 8
        }
      },
      arr: [
        { e: 9, test5: 10 },
        { f: 11, test6: 12 }
      ]
    }
    const result = deepRemoveKeys(input, ['b', /^test/])
    expect(result).toEqual({
      a: 1,
      nested: {
        c: 5,
        deepNested: {
          d: 7
        }
      },
      arr: [
        { e: 9 },
        { f: 11 }
      ]
    })
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

describe('dasherize', () => {
  it('converts camelCase to kebab-case', () => expect(dasherize('camelCase')).toBe('camel-case'))
  it('converts snake_case to kebab-case', () => expect(dasherize('snake_case')).toBe('snake-case'))
  it('converts space separated words to kebab-case', () => expect(dasherize('space separated')).toBe('space-separated'))
  it('handles already kebab-case strings', () => expect(dasherize('kebab-case')).toBe('kebab-case'))
  it('handles mixed separators', () => expect(dasherize('Mixed_Snake Case')).toBe('mixed-snake-case'))
  it('handles multiple spaces', () => expect(dasherize('multiple   spaces')).toBe('multiple-spaces'))
  it('handles tabs and multiple spaces', () => expect(dasherize('mixed\t  whitespace')).toBe('mixed-whitespace'))
  it('returns an empty string when input is empty', () => expect(dasherize('')).toBe(''))
  it('handles single word strings', () => expect(dasherize('Word')).toBe('word'))
})

describe('truthy function', () => {
  it('returns true for non-empty strings', () => {
    expect(truthy('hello')).toBe(true)
    expect(truthy('true')).toBe(true)
    expect(truthy('1')).toBe(true)
  })

  it('returns false for empty string', () => expect(truthy('')).toBe(false))
  it('returns false for string "false"', () => expect(truthy('false')).toBe(false))
  it('returns false for string "0"', () => expect(truthy('0')).toBe(false))
  it('returns true for true boolean', () => expect(truthy(true)).toBe(true))
  it('returns false for false boolean', () => expect(truthy(false)).toBe(false))

  it('returns true for non-zero numbers', () => {
    expect(truthy(1)).toBe(true)
    expect(truthy(-1)).toBe(true)
    expect(truthy(3.14)).toBe(true)
  })

  it('returns false for zero', () => expect(truthy(0)).toBe(false))
  it('returns false for null', () => expect(truthy(null)).toBe(false))
  it('returns false for undefined', () => expect(truthy(undefined)).toBe(false))

  it('returns true for non-empty objects', () => {
    expect(truthy({})).toBe(true)
    expect(truthy({ key: 'value' })).toBe(true)
  })

  it('returns false for empty arrays', () => expect(truthy([])).toBe(false))
  it('returns true for non-empty arrays', () => expect(truthy([1, 2, 3])).toBe(true))
})

describe('dig', () => {
  const testObj = {
    a: {
      b: {
        c: 42
      },
      d: [1, 2, 3]
    },
    e: null,
    f: 0
  }

  it('returns the correct value for a nested path', () => expect(dig(testObj, 'a.b.c')).toBe(42))
  it('returns the correct value for an array index', () => expect(dig(testObj, 'a.d.1')).toBe(2))
  it('returns undefined for a non-existent path', () => expect(dig(testObj, 'a.b.d')).toBeUndefined())
  it('returns undefined for a path that goes through a non-object', () => expect(dig(testObj, 'a.b.c.d')).toBeUndefined())
  it('returns null if the value is null', () => expect(dig(testObj, 'e')).toBeNull())
  it('returns 0 if the value is 0', () => expect(dig(testObj, 'f')).toBe(0))
  it('returns undefined for an empty path', () => expect(dig(testObj, '')).toBeUndefined())
  it('returns the object itself for a "." path', () => expect(dig(testObj, '.')).toBe(testObj))
})
