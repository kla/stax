import { describe, expect, it } from 'bun:test'
import { deepMapWithKeysAsync, deepMapWithKeys } from '~/utils'

describe('deepMapWithKeysAsync', () => {
  it('transforms keys and values in a simple object', async () => {
    const input = { a: 1, b: 2 }
    const result = await deepMapWithKeysAsync(input, async (path, key, value) => [key.toUpperCase(), value * 2])
    expect(result).toEqual({ A: 2, B: 4 })
  })

  it('handles nested objects', async () => {
    const input = { a: { b: 1, c: { d: 2 } } }
    const result = await deepMapWithKeysAsync(input, async (path, key, value) => [
      `${key}_modified`,
      typeof value === 'number' ? value + 1 : value
    ])
    expect(result).toEqual({
      a_modified: {
        b_modified: 2,
        c_modified: {
          d_modified: 3
        }
      }
    })
  })

  it('processes arrays of objects', async () => {
    const input = {
      items: [
        { id: 1, name: 'first' },
        { id: 2, name: 'second' }
      ]
    }
    const result = await deepMapWithKeysAsync(input, async (path, key, value) => [
      key === 'name' ? 'title' : key,
      value
    ])
    expect(result).toEqual({
      items: [
        { id: 1, title: 'first' },
        { id: 2, title: 'second' }
      ]
    })
  })

  it('handles nested arrays', async () => {
    const input = {
      data: [
        { items: [{ id: 1 }, { id: 2 }] },
        { items: [{ id: 3 }, { id: 4 }] }
      ]
    }
    const result = await deepMapWithKeysAsync(input, async (path, key, value) => [
      key === 'id' ? 'identifier' : key,
      value
    ])
    expect(result).toEqual({
      data: [
        { items: [{ identifier: 1 }, { identifier: 2 }] },
        { items: [{ identifier: 3 }, { identifier: 4 }] }
      ]
    })
  })

  it('uses the correct path for nested properties including arrays', async () => {
    const input = { a: [{ b: { c: 1 } }] }
    const paths = []
    await deepMapWithKeysAsync(input, async (path, key, value) => {
      paths.push(path)
      return [key, value]
    })
    expect(paths).toEqual(['a', 'a.0', 'a.0.b', 'a.0.b.c'])
  })

  it('allows asynchronous transformations', async () => {
    const input = { a: 1, b: 2 }
    const result = await deepMapWithKeysAsync(input, async (path, key, value) => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return [key.toUpperCase(), value * 2]
    })
    expect(result).toEqual({ A: 2, B: 4 })
  })

  it('handles empty arrays and objects', async () => {
    const input = { a: [], b: {}, c: [{}] }
    const result = await deepMapWithKeysAsync(input, async (path, key, value) => [key, value])
    expect(result).toEqual({ a: [], b: {}, c: [{}] })
  })
})

describe('deepMapWithKeys', () => {
  it('transforms keys and values in a simple object', () => {
    const input = { a: 1, b: 2 }
    const result = deepMapWithKeys(input, (path, key, value) => [key.toUpperCase(), value * 2])
    expect(result).toEqual({ A: 2, B: 4 })
  })

  it('handles nested objects', () => {
    const input = { a: { b: 1, c: { d: 2 } } }
    const result = deepMapWithKeys(input, (path, key, value) => [
      `${key}_modified`,
      typeof value === 'number' ? value + 1 : value
    ])
    expect(result).toEqual({
      a_modified: {
        b_modified: 2,
        c_modified: {
          d_modified: 3
        }
      }
    })
  })

  it('processes arrays of objects', () => {
    const input = { items: [{ id: 1, name: 'first' }, { id: 2, name: 'second' }] }
    const result = deepMapWithKeys(input, (path, key, value) => [key === 'name' ? 'title' : key, value])
    expect(result).toEqual({ items: [{ id: 1, title: 'first' }, { id: 2, title: 'second' }] })
  })

  it('handles nested arrays', () => {
    const input = {
      data: [
        { items: [{ id: 1 }, { id: 2 }] },
        { items: [{ id: 3 }, { id: 4 }] }
      ]
    }
    const result = deepMapWithKeys(input, (path, key, value) => [key === 'id' ? 'identifier' : key, value])
    expect(result).toEqual({
      data: [
        { items: [{ identifier: 1 }, { identifier: 2 }] },
        { items: [{ identifier: 3 }, { identifier: 4 }] }
      ]
    })
  })

  it('uses the correct path for nested properties including arrays', () => {
    const input = { a: [{ b: { c: 1 } }] }
    const paths = []
    deepMapWithKeys(input, (path, key, value) => {
      paths.push(path)
      return [key, value]
    })
    expect(paths).toEqual(['a', 'a.0', 'a.0.b', 'a.0.b.c'])
  })

  it('handles empty arrays and objects', () => {
    const input = { a: [], b: {}, c: [{}] }
    const result = deepMapWithKeys(input, (path, key, value) => [key, value])
    expect(result).toEqual({ a: [], b: {}, c: [{}] })
  })
})
