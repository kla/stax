import { describe, it, expect } from 'bun:test'
import { renderTemplate } from '~/staxfile/template'

describe('renderTemplate', () => {
  it('replaces tokens with callback results', () => {
    const template = 'Hello, ${{ name John Doe }}! Your age is ${{ age 30 }}.'
    const callback = (name: string, args: string[]) => {
      if (name === 'name') return args.join(' ')
      if (name === 'age') return `${parseInt(args[0]) + 1}`
      return ''
    }

    const result = renderTemplate(template, callback)
    expect(result).toBe('Hello, John Doe! Your age is 31.')
  })

  it('handles tokens without arguments', () => {
    const template = 'The current year is ${{ year }}.'
    const callback = (name: string) => name === 'year' ? '2024' : ''

    const result = renderTemplate(template, callback)
    expect(result).toBe('The current year is 2024.')
  })

  it('ignores malformed tokens', () => {
    const template = 'This is a ${{ malformed token }} and this is correct ${{ correct token }}.'
    const callback = (name: string, args: string[]) => name === 'correct' ? 'CORRECT' : 'IGNORED'

    const result = renderTemplate(template, callback)
    expect(result).toBe('This is a IGNORED and this is correct CORRECT.')
  })

  it('handles multiple tokens in a single line', () => {
    const template = '${{ greeting Hello }} ${{ name John }}! Today is ${{ day Monday }}.'
    const callback = (name: string, args: string[]) => args.join(' ')

    const result = renderTemplate(template, callback)
    expect(result).toBe('Hello John! Today is Monday.')
  })
})
