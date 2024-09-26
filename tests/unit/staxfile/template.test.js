import { expect, it, describe } from 'bun:test'
import { renderTemplate } from '~/staxfile/template'

describe('renderTemplate', () => {
  it('replaces tokens with callback results', async () => {
    const template = 'Hello, ${{ name John Doe }}! Your age is ${{ age 30 }}.'
    const callback = async (name, args) => {
      if (name === 'name') return args.join(' ')
      if (name === 'age') return `${parseInt(args[0]) + 1}`
      return ''
    }

    const result = await renderTemplate(template, callback)
    expect(result).toBe('Hello, John Doe! Your age is 31.')
  })

  it('handles tokens without arguments', async () => {
    const template = 'The current year is ${{ year }}.'
    const callback = async (name) => name === 'year' ? '2024' : ''

    const result = await renderTemplate(template, callback)
    expect(result).toBe('The current year is 2024.')
  })

  it('ignores malformed tokens', async () => {
    const template = 'This is a ${{ malformed token }} and this is correct ${{ correct token }}.'
    const callback = async (name, args) => name === 'correct' ? 'CORRECT' : 'IGNORED'

    const result = await renderTemplate(template, callback)
    expect(result).toBe('This is a IGNORED and this is correct CORRECT.')
  })

  it('handles multiple tokens in a single line', async () => {
    const template = '${{ greeting Hello }} ${{ name John }}! Today is ${{ day Monday }}.'
    const callback = async (name, args) => args.join(' ')

    const result = await renderTemplate(template, callback)
    expect(result).toBe('Hello John! Today is Monday.')
  })

  it('handles simple arguments', async () => {
    const input = "${{ test arg1 arg2 arg3 }}"
    const result = await renderTemplate(input, async (name, args) => `${name}:${args.join(',')}`)
    expect(result).toBe("test:arg1,arg2,arg3")
  })

  it('handles single-quoted arguments', async () => {
    const input = "${{ test 'arg with spaces' normal_arg }}"
    const result = await renderTemplate(input, async (name, args) => `${name}:${args.join(',')}`)
    expect(result).toBe("test:arg with spaces,normal_arg")
  })

  it('handles multi-part quoted arguments', async () => {
    const input = "${{ test 'arg with multiple parts' normal_arg }}"
    const result = await renderTemplate(input, async (name, args) => `${name}:${args.join(',')}`)
    expect(result).toBe("test:arg with multiple parts,normal_arg")
  })

  it('handles mixed quoted and unquoted arguments', async () => {
    const input = "${{ test normal_arg 'quoted arg' another_normal 'multi part quoted arg' }}"
    const result = await renderTemplate(input, async (name, args) => `${name}:${args.join(',')}`)
    expect(result).toBe("test:normal_arg,quoted arg,another_normal,multi part quoted arg")
  })

  it('handles empty arguments', async () => {
    const input = "${{ test }}"
    const result = await renderTemplate(input, async (name, args) => `${name}:${args.length}`)
    expect(result).toBe("test:0")
  })

  it('handles unclosed quotes', async () => {
    const input = "${{ test 'unclosed quote argument }}"
    const result = await renderTemplate(input, async (name, args) => `${name}:${args.join(',')}`)
    expect(result).toBe("test:unclosed quote argument")
  })

  it('handles multiple template expressions', async () => {
    const input = "Hello ${{ test arg1 }} world ${{ test2 'arg2 with spaces' }}"
    const result = await renderTemplate(input, async (name, args) => `${name}:${args.join('|')}`)
    expect(result).toBe("Hello test:arg1 world test2:arg2 with spaces")
  })
})
