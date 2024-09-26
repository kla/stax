import { describe, it, expect, afterEach, beforeEach, mock } from 'bun:test'
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

  afterEach(() => {
    mock.restore()
    expression.clearCache()
  })

  it('evaluates undefined stax config values', async () => {
    expect(await expression.evaluate('stax.app', [])).toBe('tests')
  })

  // it('evaluates read function', () => {
  //   const result = expression.evaluate('read', [__filename, 'default'])
  //   expect(result).toContain('import { describe, it, expect, beforeEach } from \'bun:test\'')
  // })

  it('evaluates mount_workspace function', async () => {
    const result = await expression.evaluate('mount_workspace', [])
    expect(result).toBe(`${path.resolve('./tests')}:/workspaces/tests`)
  })

  it('evaluates mount_ssh_auth_sock function for Darwin', async () => {
    expression.platform = mock(() => 'darwin')
    expect(await expression.evaluate('mount_ssh_auth_sock', [])).toBe('${{ stax.ssh_auth_sock }}:${{ stax.ssh_auth_sock }}')
  })

  it('evaluates mount_ssh_auth_sock function for Linux', async () => {
    expression.platform = mock(() => 'linux')
    expect(await expression.evaluate('mount_ssh_auth_sock', [])).toBe('${{ stax.host_services }}:/run/host-services')
  })

  it('evaluates resolve function', async () => {
    expect(await expression.evaluate('resolve', ['/test/path'])).toBe('/test/path')
  })

  it('evaluates user function', async () => {
    expect(await expression.evaluate('user', [])).toBe(os.userInfo().username)
  })

  it('evaluates user_id function', async () => {
    expect(await expression.evaluate('user_id', [])).toBe(process.getuid().toString())
  })

  it('evaluates dasherize function', async () => {
    expect(await expression.evaluate('dasherize', ['TestString'])).toBe('test-string')
  })

  it('evaluates dasherize function with stax.app', async () => {
    staxfile.config.set('app', 'MyTestApp')
    const result = await expression.evaluate('dasherize', ['stax.app'])
    expect(result).toBe('my-test-app')
  })

  it('evaluates dasherize function with undefined stax config', async () => {
    const result = await expression.evaluate('dasherize', ['stax.undefined_key'])
    expect(result).toBeUndefined()
    expect(staxfile.warnings).toContain("Undefined reference to 'stax.undefined_key'")
  })

  it('adds warning for invalid expression', async () => {
    await expression.evaluate('invalid_expression', [])
    expect(staxfile.warnings).toContain('Invalid template expression: invalid_expression')
  })

  it('adds warning for undefined stax config', async () => {
    await expression.evaluate('stax.undefined_key', [])
    console.log(staxfile.warnings)
    expect(staxfile.warnings).toContain("Undefined reference to 'stax.undefined_key'")
  })

  describe('test', () => {
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

    it('returns true when pattern is found in file', async () => {
      mockStaxfile.location.readSync.mockImplementation(() => 'Hello, world!')
      const result = await expressions.evaluate('test', ['test.txt', 'world'])
      expect(result).toBe('true')
    })

    it('returns false when pattern is not found in file', async () => {
      mockStaxfile.location.readSync.mockImplementation(() => 'Hello, world!')
      const result = await expressions.evaluate('test', ['test.txt', 'foo'])
      expect(result).toBe('false')
    })

    it('uses default value when file cannot be read', async () => {
      mockStaxfile.location.readSync.mockImplementation(() => { throw new Error('File not found') })
      const result = await expressions.evaluate('test', ['nonexistent.txt', 'pattern'])
      expect(result).toBe('false')
    })
  })
})
