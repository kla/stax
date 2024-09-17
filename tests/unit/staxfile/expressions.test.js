import { describe, it, expect, beforeEach, mock } from 'bun:test'
import Expressions from '~/staxfile/expressions'

describe('Expressions', () => {
  let expression
  let mockStaxfile

  beforeEach(() => {
    mockStaxfile = {
      warnings: { add: mock(() => {}) },
      config: {
        hasProperty: mock(() => true),
        fetch: mock((key) => `mock_${key}`),
      },
      location: {
        local: true,
        readSync: mock(() => 'mock_file_content'),
      },
    }
    expression = new Expressions(mockStaxfile)
  })

  it('evaluates stax config values', () => {
    const result = expression.evaluate('stax.some_key', [])
    expect(result).toBe('mock_some_key')
    expect(mockStaxfile.config.fetch).toHaveBeenCalledWith('some_key')
  })

  it('evaluates read function', () => {
    const result = expression.evaluate('read', ['test.txt', 'default'])
    expect(result).toBe('mock_file_content')
    expect(mockStaxfile.location.readSync).toHaveBeenCalledWith('test.txt')
  })

  // it('evaluates mount_workspace function', () => {
  //   mockStaxfile.config.source = '/mock/source'
  //   mockStaxfile.config.workspace = '/mock/workspace'
  //   const result = expression.evaluate('mount_workspace', [])
  //   expect(result).toBe('/mock/source:/mock/workspace')
  // })

  it('evaluates mount_ssh_auth_sock function', () => {
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    const result = expression.evaluate('mount_ssh_auth_sock', [])
    expect(result).toBe('${{ stax.ssh_auth_sock }}:${{ stax.ssh_auth_sock }}')
    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  it('evaluates path.resolve function', () => {
    const result = expression.evaluate('path.resolve', ['/test/path'])
    expect(result).toBe('/test/path')
  })

  it('evaluates user function', () => {
    const originalUser = process.env.USER
    process.env.USER = 'testuser'
    const result = expression.evaluate('user', [])
    expect(result).toBe('testuser')
    process.env.USER = originalUser
  })

  it('evaluates user_id function', () => {
    const result = expression.evaluate('user_id', [])
    expect(result).toBe(process.getuid().toString())
  })

  it('evaluates dasherize function', () => {
    const result = expression.evaluate('dasherize', ['TestString'])
    expect(result).toBe('test-string')
  })

  // it('evaluates exists function', () => {
  //   const result = expression.evaluate('exists', ['/existing/path'])
  //   expect(result).toBe('true')
  // })

  it('adds warning for invalid expression', () => {
    expression.evaluate('invalid_expression', [])
    expect(mockStaxfile.warnings.add).toHaveBeenCalledWith('Invalid template expression: invalid_expression')
  })

  it('adds warning for undefined stax config', () => {
    mockStaxfile.config.hasProperty = mock(() => false)
    expression.evaluate('stax.undefined_key', [])
    expect(mockStaxfile.warnings.add).toHaveBeenCalledWith("Undefined reference to 'stax.undefined_key'")
  })
})
