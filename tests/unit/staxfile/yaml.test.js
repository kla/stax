import { beforeEach, describe, it, expect } from 'bun:test'
import { loadFile, dump } from '~/staxfile/yaml'
import { resolve } from '~/utils'

describe('loadFile', () => {
  const fixturesDir = resolve(__dirname, '../../../tests/fixtures')
  const composeYaml = resolve(fixturesDir, 'some_service.staxfile')
  let yaml

  beforeEach(() => yaml = loadFile(composeYaml))

  it('loads and processes a YAML file with imports', () => {
    expect(yaml.stax.app).toBe('some_service')
    expect(yaml.stax.vars.ruby_version).toBe('2.0.1')
    expect(yaml.stax.vars.rails_server_port).toBe(3000)
    expect(Object.keys(yaml.volumes).length).toBe(2)
  })

  it('parses resolve_relative', () => {
    expect(yaml.services.web.build.context).toBe(resolve(fixturesDir, 'build'))
    expect(yaml.services.web.build.dockerfile).toBe(resolve(fixturesDir, 'build/Dockerfile'))
  })

  it('strips _stax_import_ anchors', () => {
    expect(dump(yaml)).not.toContain('_stax_import_')
  })
})
