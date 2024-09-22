import { describe, it, expect, beforeEach, mock } from 'bun:test'
import Expressions from '~/staxfile/expressions'
import Staxfile from '~/staxfile'
import os from 'os'
import path from 'path'

describe('Expressions', () => {
  let expression
  let staxfile

  beforeEach(() => {
    staxfile = new Staxfile({ source: './tests', staxfile: './tests/Staxfile', workspace: '/workspaces/tests' })
    expression = new Expressions(staxfile)
  })

  it('evaluates undefined stax config values', () => {
    const result = expression.evaluate('stax.app', [])
    expect(result).toBe('tests')
  })

  // it('evaluates read function', () => {
  //   const result = expression.evaluate('read', [__filename, 'default'])
  //   expect(result).toContain('import { describe, it, expect, beforeEach } from \'bun:test\'')
  // })

  it('evaluates mount_workspace function', () => {
    const result = expression.evaluate('mount_workspace', [])
    expect(result).toBe(`${path.resolve('./tests')}:/workspaces/tests`)
  })

  it('evaluates mount_ssh_auth_sock function', () => {
    const result = expression.evaluate('mount_ssh_auth_sock', [])
    expect(result).toBe('${{ stax.host_services }}:/run/host-services')
  })

  it('evaluates path.resolve function', () => {
    const result = expression.evaluate('path.resolve', ['/test/path'])
    expect(result).toBe('/test/path')
  })

  it('evaluates user function', () => {
    const result = expression.evaluate('user', [])
    expect(result).toBe(os.userInfo().username)
  })

  it('evaluates user_id function', () => {
    const result = expression.evaluate('user_id', [])
    expect(result).toBe(process.getuid().toString())
  })

  it('evaluates dasherize function', () => {
    const result = expression.evaluate('dasherize', ['TestString'])
    expect(result).toBe('test-string')
  })

  it('evaluates dasherize function with stax.app', () => {
    staxfile.config.set('app', 'MyTestApp')
    const result = expression.evaluate('dasherize', ['stax.app'])
    expect(result).toBe('my-test-app')
  })

  it('evaluates dasherize function with undefined stax config', () => {
    const result = expression.evaluate('dasherize', ['stax.undefined_key'])
    expect(result).toBeUndefined()
    expect(staxfile.warnings).toContain("Undefined reference to 'stax.undefined_key'")
  })

  it('adds warning for invalid expression', () => {
    expression.evaluate('invalid_expression', [])
    expect(staxfile.warnings).toContain('Invalid template expression: invalid_expression')
  })

  it('adds warning for undefined stax config', () => {
    expression.evaluate('stax.undefined_key', [])
    console.log(staxfile.warnings)
    expect(staxfile.warnings).toContain("Undefined reference to 'stax.undefined_key'")
  })

  describe('grep', () => {
    let expressions
    let mockStaxfile

    beforeEach(() => {
      mockStaxfile = {
        warnings: { add: mock(() => {}) },
        config: {
          hasProperty: mock(() => true),
          fetch: mock(() => 'mocked-value'),
        },
        location: {
          readSync: mock(() => 'file content'),
        },
      }
      expressions = new Expressions(mockStaxfile)
    })

    it('returns true when pattern is found in file', () => {
      mockStaxfile.location.readSync.mockImplementation(() => 'Hello, world!')
      const result = expressions.evaluate('grep', ['test.txt', 'world'])
      expect(result).toBe('true')
    })

    it('returns false when pattern is not found in file', () => {
      mockStaxfile.location.readSync.mockImplementation(() => 'Hello, world!')
      const result = expressions.evaluate('grep', ['test.txt', 'foo'])
      expect(result).toBe('false')
    })

    it('uses default value when file cannot be read', () => {
      mockStaxfile.location.readSync.mockImplementation(() => { throw new Error('File not found') })
      const result = expressions.evaluate('grep', ['nonexistent.txt', 'pattern'])
      expect(result).toBe('false')
    })
  })
})
