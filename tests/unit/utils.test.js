import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { dasherize, deepRemoveKeys, dig, directoryExists, flattenObject, isFile, timeAgo, truthy, verifyDirectory, presence, resolve, deepMapWithKeysAsync, compact } from '~/utils'
import * as os from 'os'
import * as path from 'path'

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
  it('returns the default value when path is not found', () => expect(dig(testObj, 'some.invalid.path', { default: 'hello'})).toBe('hello'))
  it('throws error when required path is not found', () => expect(() => dig({ a: { b: 1 } }, 'a.c', { required: true })).toThrow('Required path "a.c" not found in object'))

  it('does not throw for existing paths when required is true', () => {
    const testObj = { a: { b: 1 } }
    expect(() => dig(testObj, 'a.b', { required: true })).not.toThrow()
    expect(dig(testObj, 'a.b', { required: true })).toBe(1)
  })
})

describe('timeAgo', () => {
  it('formats seconds correctly', () => {
    expect(timeAgo(45000)).toBe('45s')
    expect(timeAgo(1000)).toBe('1s')
  })

  it('formats minutes and seconds correctly', () => {
    expect(timeAgo(65000)).toBe('1m 5s')
    expect(timeAgo(3599000)).toBe('59m 59s')
  })

  it('formats hours and minutes correctly', () => {
    expect(timeAgo(3600000)).toBe('1h 0m')
    expect(timeAgo(5400000)).toBe('1h 30m')
    expect(timeAgo(86399000)).toBe('23h 59m')
  })

  it('formats days and hours correctly', () => {
    expect(timeAgo(86400000)).toBe('1d 0h')
    expect(timeAgo(90000000)).toBe('1d 1h')
    expect(timeAgo(172800000)).toBe('2d 0h')
  })

  it('handles edge cases', () => {
    expect(timeAgo(0)).toBe('0s')
    expect(timeAgo(999)).toBe('0s')
    expect(timeAgo(1000 * 60 * 60 * 24 * 365)).toBe('365d 0h')
  })
})

describe('presence', () => {
  it('returns the value for non-empty strings', () => expect(presence('hello')).toBe('hello'))
  it('returns null for empty strings', () => expect(presence('')).toBeNull())
  it('returns null for strings with only whitespace', () => expect(presence('   ')).toBeNull())
  it('returns null for empty arrays', () => expect(presence([])).toBeNull())
  it('returns the number for non-zero numbers', () => expect(presence(42)).toBe(42))
  it('returns zero for zero', () => expect(presence(0)).toBe(0))
  it('returns null for null', () => expect(presence(null)).toBeNull())
  it('returns null for undefined', () => expect(presence(undefined)).toBeNull())
  it('returns true for true', () => expect(presence(true)).toBe(true))
  it('returns false for false', () => expect(presence(false)).toBe(false))

  it('returns the array for non-empty arrays', () => {
    const arr = [1, 2, 3]
    expect(presence(arr)).toBe(arr)
  })

  it('returns the object for non-empty objects', () => {
    const obj = { key: 'value' }
    expect(presence(obj)).toBe(obj)
  })

  it('returns an empty object (not null) for empty objects', () => {
    const obj = {}
    expect(presence(obj)).toBe(obj)
  })
})

describe('verifyDirectory', () => {
  const mockExit = mock(() => {})
  const mockConsoleError = mock(() => {})

  beforeEach(() => {
    mockExit.mockClear()
    mockConsoleError.mockClear()
    global.process.exit = mockExit
    global.console.error = mockConsoleError
  })

  it('returns true for an existing directory', () => {
    const result = verifyDirectory(__dirname)
    expect(result).toBe(true)
    expect(mockExit).not.toHaveBeenCalled()
  })

  it('exits process with error for non-existing directory', () => {
    const nonExistentDir = '/path/to/non/existent/directory'
    verifyDirectory(nonExistentDir)
    expect(mockExit).toHaveBeenCalledWith(1)
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Directory not found'))
  })

  it('uses custom error message when provided', () => {
    const nonExistentDir = '/custom/path'
    const customMessage = 'Custom error message'
    verifyDirectory(nonExistentDir, customMessage)
    expect(mockExit).toHaveBeenCalledWith(1)
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining(customMessage))
  })

  it('handles edge cases like empty string', () => {
    verifyDirectory('')
    expect(mockExit).toHaveBeenCalledWith(1)
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Directory not found'))
  })
})

describe('resolve', () => {
  it('resolves path with tilde', () => expect(resolve('~/documents/file.txt')).toBe(path.resolve(os.homedir(), 'documents/file.txt')))
  it('resolves path without tilde', () => expect(resolve('/absolute/path/file.txt')).toBe(path.resolve('/absolute/path/file.txt')))
  it('resolves relative path', () => expect(resolve('relative/path/file.txt')).toBe(path.resolve(process.cwd(), 'relative/path/file.txt')))
  it('resolves path with just tilde', () => expect(resolve('~')).toBe(path.resolve(os.homedir())))
  it('resolves empty string to current working directory', () => expect(resolve('')).toBe(path.resolve(process.cwd())))
  it('resolves multiple path segments', () => expect(resolve('~/documents', 'project', 'file.txt')).toBe(path.resolve(os.homedir(), 'documents', 'project', 'file.txt')))
  it('resolves multiple path segments with absolute path', () => expect(resolve('/root', 'user', 'documents')).toBe(path.resolve('/root', 'user', 'documents')))
  it('resolves multiple path segments with relative paths', () => expect(resolve('project', 'src', 'components')).toBe(path.resolve(process.cwd(), 'project', 'src', 'components')))
  it('resolves mixed absolute and relative paths', () => expect(resolve('/root', 'user', '../documents')).toBe(path.resolve('/root', 'user', '../documents')))
  it('handles tilde expansion only for the first argument', () => expect(resolve('~/documents', '~/projects')).toBe(path.resolve(os.homedir(), 'documents', '~/projects')))
})

describe('compact', () => {
  it('removes null values', () => expect(compact([1, null, 2])).toEqual([1, 2]))
  it('removes undefined values', () => expect(compact([1, undefined, 2])).toEqual([1, 2]))
  it('removes empty arrays', () => expect(compact([1, [], 2])).toEqual([1, 2]))
  it('removes empty strings', () => expect(compact([1, '', 2])).toEqual([1, 2]))
  it('keeps zero values', () => expect(compact([1, 0, 2])).toEqual([1, 0, 2]))
  it('keeps false values', () => expect(compact([1, false, 2])).toEqual([1, false, 2]))
  it('keeps non-empty arrays', () => expect(compact([1, [2, 3], 4])).toEqual([1, [2, 3], 4]))
  it('handles empty input array', () => expect(compact([])).toEqual([]))
  it('handles array with only empty values', () => expect(compact([null, undefined, '', []])).toEqual([]))
})
