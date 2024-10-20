import { beforeEach, describe, it, expect } from 'bun:test'
import { loadFile, dump } from '~/yamler'
import { resolve } from '~/utils'

describe('YamlER', () => {
  const fixturesDir = resolve(__dirname, '../../tests/fixtures')
  const composeYaml = resolve(fixturesDir, 'some_service.staxfile')
  let yaml

  beforeEach(() => yaml = loadFile(composeYaml))

  it('loads and processes a YAML file with imports', () => {
    expect(yaml.stax.app).toBe('some_service')
    expect(Object.keys(yaml)).toEqual(['stax', 'volumes', 'services'])
  })

  it('can extend at the root', () => {
    expect(Object.keys(yaml.volumes)).toEqual(['shared-home', '${{ stax.workspace_volume }}'])
    expect(Object.keys(yaml.services)).toEqual(['web'])
    expect(yaml.services.web).toBeDefined()
  })

  it('handles extended attributes', () => {
    expect(yaml.stax.vars.rails_server_port).toBe(3000)
    expect(yaml.stax.vars.ruby_version).toBe('2.0.1')
  })

  it('handles nested imports', () => {
    expect(yaml.services.web.build.context).toBe(resolve(fixturesDir, 'build'))
  })

  it('parses resolve_relative', () => {
    expect(yaml.services.web.build.context).toBe(resolve(fixturesDir, 'build'))
    expect(yaml.services.web.build.dockerfile).toBe(resolve(fixturesDir, 'build/Dockerfile'))
  })

  it('strips _stax_import_ anchors', () => {
    expect(dump(yaml)).not.toContain('_stax_import_')
  })
})
