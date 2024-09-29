import { describe, it, expect } from 'bun:test'
import { loadFile, dump } from '~/staxfile/yaml'
import path from 'path'

describe('loadFile', () => {
  const fixturesDir = path.resolve(__dirname, '../../../tests/fixtures')
  const composeYaml = path.resolve(fixturesDir, 'compose.yaml')

  it('loads and processes a YAML file with imports', () => {
    const result = loadFile(composeYaml)
    expect(result.services.web.build.image).toBe('ubuntu:latest')
    expect(result.services.web.command).toBe('bin/rails server')
    expect(result.something.child1.child2.child).toBe(2)
  })
})
