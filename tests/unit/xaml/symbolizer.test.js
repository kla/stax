import { describe, it, expect } from 'bun:test'
import { replaceEachSymbol, symbols } from '~/xaml/symbolizer'

describe('replaceEachSymbol', () => {
  it('returns non-string inputs unchanged', () => expect(replaceEachSymbol(null, async () => '')).resolves.toBe(null))
  it('returns string without symbols unchanged', () => expect(replaceEachSymbol('test string', async () => '')).resolves.toBe('test string'))

  it('handles nulls when symbol is not embedded in a string', () => expect(replaceEachSymbol('@@stax:12345678-1234-1234-1234-123456789abc@@', () => null)).resolves.toBe(null))
  it('handles undefined when symbol is not embedded in a string', () => expect(replaceEachSymbol('@@stax:12345678-1234-1234-1234-123456789abc@@', () => undefined)).resolves.toBe(undefined))
  it('handles numbers when symbol is not embedded in a string', () => expect(replaceEachSymbol('@@stax:12345678-1234-1234-1234-123456789abc@@', () => 123)).resolves.toBe(123))
  it('handles booleans when symbol is not embedded in a string', () => expect(replaceEachSymbol('@@stax:12345678-1234-1234-1234-123456789abc@@', () => true)).resolves.toBe(true))
  it('handles objects when symbol is not embedded in a string', () => expect(replaceEachSymbol('@@stax:12345678-1234-1234-1234-123456789abc@@', () => ({a: 1, b: 2}))).resolves.toEqual({a: 1, b: 2}))
  it('handles arrays when symbol is not embedded in a string', () => expect(replaceEachSymbol('@@stax:12345678-1234-1234-1234-123456789abc@@', () => [1, 2, 3])).resolves.toEqual([1, 2, 3]))
  it('handles strings when symbol is not embedded in a string', () => expect(replaceEachSymbol('@@stax:12345678-1234-1234-1234-123456789abc@@', () => 'string')).resolves.toBe('string'))

  it('converts null to string when symbol is embedded', () => expect(replaceEachSymbol('before @@stax:12345678-1234-1234-1234-123456789abc@@ after', () => null)).resolves.toBe('before null after'))
  it('converts undefined to string when symbol is embedded', () => expect(replaceEachSymbol('before @@stax:12345678-1234-1234-1234-123456789abc@@ after', () => undefined)).resolves.toBe('before undefined after'))
  it('converts numbers to string when symbol is embedded', () => expect(replaceEachSymbol('before @@stax:12345678-1234-1234-1234-123456789abc@@ after', () => 123)).resolves.toBe('before 123 after'))
  it('converts booleans to string when symbol is embedded', () => expect(replaceEachSymbol('before @@stax:12345678-1234-1234-1234-123456789abc@@ after', () => true)).resolves.toBe('before true after'))
  it('converts objects to string when symbol is embedded', () => expect(replaceEachSymbol('before @@stax:12345678-1234-1234-1234-123456789abc@@ after', () => ({a: 1, b: 2}))).resolves.toBe('before [object Object] after'))
  it('converts arrays to string when symbol is embedded', () => expect(replaceEachSymbol('before @@stax:12345678-1234-1234-1234-123456789abc@@ after', () => [1, 2, 3])).resolves.toBe('before 1,2,3 after'))
  it('keeps strings as-is when symbol is embedded', () => expect(replaceEachSymbol('before @@stax:12345678-1234-1234-1234-123456789abc@@ after', () => 'string')).resolves.toBe('before string after'))

  it('replaces a single symbol', () => {
    const input = 'before @@stax:12345678-1234-1234-1234-123456789abc@@ after'
    const callback = async (_, uuid) => `replaced-${uuid}`
    return expect(replaceEachSymbol(input, callback)).resolves.toBe('before replaced-12345678-1234-1234-1234-123456789abc after')
  })

  it('replaces multiple symbols', () => {
    const input = '@@stax:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa@@ middle @@stax:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb@@'
    const callback = async (_, uuid) => `<${uuid}>`
    return expect(replaceEachSymbol(input, callback)).resolves.toBe('<aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa> middle <bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb>')
  })

  it('handles async callbacks correctly', () => {
    const input = '@@stax:12345678-1234-1234-1234-123456789abc@@'
    const callback = async () => {
      await new Promise(resolve => setTimeout(resolve, 1))
      return 'async-result'
    }
    return expect(replaceEachSymbol(input, callback)).resolves.toBe('async-result')
  })
})

describe('symbols', () => {
  it('returns empty array for null input', () => expect(symbols(null)).toEqual([]))
  it('returns empty array for undefined input', () => expect(symbols(undefined)).toEqual([]))
  it('returns empty array for non-string input', () => expect(symbols(123)).toEqual([]))
  it('returns empty array for object input', () => expect(symbols({})).toEqual([]))
  it('returns empty array for string without symbols', () => expect(symbols('test string')).toEqual([]))

  it('extracts a single symbol uuid', () => {
    const input = '@@stax:12345678-1234-1234-1234-123456789abc@@'
    expect(symbols(input)).toEqual(['12345678-1234-1234-1234-123456789abc'])
  })

  it('extracts multiple symbol uuids', () => {
    const input = '@@stax:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa@@ middle @@stax:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb@@'
    expect(symbols(input)).toEqual([
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    ])
  })

  it('extracts symbol uuid from embedded context', () => {
    const input = 'before @@stax:12345678-1234-1234-1234-123456789abc@@ after'
    expect(symbols(input)).toEqual(['12345678-1234-1234-1234-123456789abc'])
  })
})
