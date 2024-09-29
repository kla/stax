import { describe, it, expect } from 'bun:test'
import { loadFile } from '~/staxfile/yaml'
import yaml from 'js-yaml'
import path from 'path'

describe('loadFile', () => {
  const fixturesDir = path.resolve(__dirname, '../../../tests/fixtures')
  const composeYaml = path.resolve(fixturesDir, 'compose.yaml')

  it('loads and processes a YAML file with imports', () => {
    const result = yaml.load(loadFile(composeYaml))
    expect(result.services.web.build.image).toBe('ubuntu:latest')
    expect(result.services.web.command).toBe('bin/rails server')
  })
})
