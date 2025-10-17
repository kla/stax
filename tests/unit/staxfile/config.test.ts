import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { readFileSync } from 'fs'
import Config from '~/staxfile/config'
import yaml from 'js-yaml'
import * as utils from '~/utils'

describe('Config', () => {
  let config
  let exitMock

  beforeEach(() => {
    exitMock = { called: false, code: null, message: null }
    mock.module('~/utils', () => ({
      ...utils,
      exit: (code, message) => {
        exitMock.called = true
        exitMock.code = code
        exitMock.message = message
      }
    }))
    config = new Config({ source: './tests/fixtures', ...yaml.load(readFileSync('./tests/fixtures/Staxfile', 'utf-8')).stax })
  })

  it('creates a new Config instance', () => {
    expect(config).toBeInstanceOf(Config)
    expect(config.source).toBe(utils.resolve('./tests/fixtures'))
    expect(config.staxfile).toBe(utils.resolve('./tests/fixtures/Staxfile'))
    expect(config.app).toBe('test')
    expect(config.requires).toEqual(['mysql', 'redis'])
  })

  it('checks if a property exists', () => {
    expect(config.hasProperty('source')).toBe(true)
    expect(config.hasProperty('app')).toBe(true)
    expect(config.hasProperty('vars.user')).toBe(true)
    expect(config.hasProperty('vars.nonexistent')).toBe(false)
    expect(config.hasProperty('nonexistent')).toBe(false)
  })

  it('fetches a property value', () => {
    expect(config.fetch('source')).toBe(utils.resolve('./tests/fixtures'))
    expect(config.fetch('app')).toBe('test')
    expect(config.fetch('vars.user')).toBe('app')
    expect(config.fetch('vars.nonexistent')).toBeUndefined()
    expect(config.fetch('nonexistent')).toBeUndefined()
  })

  it('sets a valid property value', () => {
    config.set('app', 'newValue')
    expect(config.app).toBe('newValue')

    config.set('vars', { user: 'newUser' })
    expect(config.vars).toEqual({ user: 'newUser' })
  })

  it('sets a property value using dot notation', () => {
    config.set('vars.user', 'newValue')
    expect(config.vars.user).toBe('newValue')

    config.set('vars.user', 'newValue2')
    expect(config.vars.user).toBe('newValue2')
  })

  it('logs a warning when attempting to assign an object to a scalar value', () => {
    const warnSpy = console.warn = () => {}
    const warnCalls = []
    console.warn = (...args) => {
      warnCalls.push(args)
      warnSpy(...args)
    }

    config.set('vars.user', 'name')
    config.set('vars.user.id', 1)

    expect(warnCalls.length).toBe(1)
    expect(warnCalls[0][0]).toBe("⚠️  Cannot set 'vars.user.id': 'vars.user' is not an object")
    expect(config.vars.user).toBe('name')
  })

  it('does not create intermediate objects for non-existent paths', () => {
    const warnSpy = console.warn = () => {}
    const warnCalls = []
    console.warn = (...args) => {
      warnCalls.push(args)
      warnSpy(...args)
    }

    config.set('nonexistent.deeply.nested.prop', 'value')
    expect(config.nonexistent).toBeUndefined()
  })

  it('sets a property value using stax.vars. prefix', () => {
    config.set('stax.vars.user', 'newValue')
    expect(config.vars.user).toBe('newValue')
  })

  it('allows valid app names', () => {
    const validNames = ['myapp', 'my-app', 'my_app', 'app123']
    validNames.forEach(name => {
      config.set('app', name)
      expect(config.app).toBe(name)
    })
  })

  it('rejects invalid app names', () => {
    const invalidNames = ['my app', 'my@app', 'app!', 'app/name']

    invalidNames.forEach(name => {
      exitMock.called = false
      config.set('app', name)

      expect(exitMock.called).toBe(true)
      expect(exitMock.code).toBe(1)
      expect(exitMock.message).toEqual({
        message: `⚠️ App name can only contain alphanumeric characters, dashes, and underscores: ${name}`
      })
      expect(config.app).not.toBe(name)
    })
  })

  it('parses requires as an array', () => {
    config.set('requires', JSON.stringify(['mysql', 'redis']))
    expect(config.requires).toEqual(['mysql', 'redis'])
  })

  it('supports before_up hook property', () => {
    const configWithHook = new Config({
      context: 'test',
      app: 'testapp',
      staxfile: './tests/fixtures/Staxfile',
      source: './tests/fixtures',
      before_up: 'echo "Starting app"'
    })

    expect(configWithHook.before_up).toEqual('echo "Starting app"')
    expect(configWithHook.hasProperty('before_up')).toBe(true)
    expect(configWithHook.fetch('before_up')).toEqual('echo "Starting app"')
  })

  it('can set before_up property', () => {
    config.set('before_up', 'echo "New before_up hook"')
    expect(config.before_up).toEqual('echo "New before_up hook"')
  })

  it('supports after_down hook property', () => {
    const configWithHook = new Config({
      context: 'test',
      app: 'testapp',
      staxfile: './tests/fixtures/Staxfile',
      source: './tests/fixtures',
      after_down: 'echo "App stopped"'
    })

    expect(configWithHook.after_down).toEqual('echo "App stopped"')
    expect(configWithHook.hasProperty('after_down')).toBe(true)
    expect(configWithHook.fetch('after_down')).toEqual('echo "App stopped"')
  })

  it('can set after_down property', () => {
    config.set('after_down', 'echo "New after_down hook"')
    expect(config.after_down).toEqual('echo "New after_down hook"')
  })

  it('supports before_down hook property', () => {
    const configWithHook = new Config({
      context: 'test',
      app: 'testapp',
      staxfile: './tests/fixtures/Staxfile',
      source: './tests/fixtures',
      before_down: 'echo "App stopping"'
    })

    expect(configWithHook.before_down).toEqual('echo "App stopping"')
    expect(configWithHook.hasProperty('before_down')).toBe(true)
    expect(configWithHook.fetch('before_down')).toEqual('echo "App stopping"')
  })

  it('can set before_down property', () => {
    config.set('before_down', 'echo "New before_down hook"')
    expect(config.before_down).toEqual('echo "New before_down hook"')
  })
})
