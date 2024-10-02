import { beforeEach, describe, it, expect } from 'bun:test'
import { loadFile, dump } from '~/staxfile/yaml'
import path from 'path'

describe('loadFile', () => {
  const fixturesDir = path.resolve(__dirname, '../../../tests/fixtures')
  const composeYaml = path.resolve(fixturesDir, 'compose.staxfile')
  let yaml

  beforeEach(() => yaml = loadFile(composeYaml))

  it('loads and processes a YAML file with imports', () => {
    expect(yaml.stax.vars.ruby_version).toBe('3.3.3')
    expect(yaml.services.web.build.dockerfile).toBe('Dockerfile')
    expect(yaml.services.web.command).toBe('bin/rails server')
    expect(yaml.services.web.environment.PATH).toBe('/usr/local/bin:/usr/bin:/bin')
  })

  it('parses resolve_relative', () => {
    expect(yaml.services.web.build.context).toBe(path.resolve(fixturesDir, 'imports'))
  })
})
