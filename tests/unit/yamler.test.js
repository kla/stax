import { afterEach, beforeEach, describe, it, expect } from 'bun:test'
import { loadFile, dump } from '~/yamler'
import { dig, resolve } from '~/utils'
import { writeFileSync } from 'fs'
import tmp from 'tmp'

const tempFiles = []

function tempYamlFile(obj) {
  const file = tmp.fileSync({ postfix: '.yaml' })
  writeFileSync(file.name, dump(obj))
  tempFiles.push(file)
  return file.name
}

describe('YamlER', () => {
  const fixturesDir = resolve(__dirname, '../../tests/fixtures')
  const composeYaml = resolve(fixturesDir, 'some_service.staxfile')
  let yaml

  const expressionCallback = (attributes, path, key, args) => {
    if (key == 'get') return dig(attributes, args[0])
    if (key == 'expression') return '${{ ' + args[0] + ' ' + args[1] + ' }}'
    return '<' + [key].concat(args).join(' ') + '>'
  }

  beforeEach(async () => {
    tempFiles.length = 0
    yaml = await loadFile(composeYaml, expressionCallback)
  })
  afterEach(() => tempFiles.forEach(file => file.removeCallback()))

  it('loads and processes a YAML file with imports', () => {
    expect(yaml.stax.app).toBe('some_service')
    expect(Object.keys(yaml)).toEqual(['stax', 'volumes', 'services'])
  })

  it('can extend at the root', () => {
    expect(Object.keys(yaml.volumes)).toEqual(['shared-home', '<stax.workspace_volume>'])
    expect(Object.keys(yaml.services)).toEqual(['web'])
    expect(yaml.services.web).toBeDefined()
  })

  it('handles extended attributes', () => {
    expect(yaml.stax.vars.rails_server_port).toBe(3000)
    expect(yaml.stax.vars.ruby_version).toBe('2.0.1')
  })

  it('handles nested imports', () => {
    expect(yaml.services.web.build.context).toBe('<resolve_relative ../build>')
  })

  it('strips _stax_import_ anchors', () => {
    expect(dump(yaml)).not.toContain('_stax_import_')
  })

  it('handles expressions that reference a value from an attribute set by another expression', () => {
    expect(yaml.stax.vars.value1).toBe('some_service')
    expect(yaml.stax.vars.value2).toBe('some_service')
  })

  it('handles expressions that reference later attributes with an expression', () => {
    expect(yaml.stax.vars.value3).toBe('value4')
    expect(yaml.stax.vars.value4).toBe('value4')
  })

  it('handles expressions that return an expression', () => {
    expect(yaml.stax.vars.value5).toBe('some_service')
  })

  it('throws an error when expressions have circular references', async () => {
    const circularYaml = tempYamlFile({ value1: '${{ get value2 }}', value2: '${{ get value1 }}' })
    const promise = loadFile(circularYaml, expressionCallback)

    await expect(promise).rejects.toThrow('Maximum expression parsing iterations (100) exceeded. Possible circular reference in expressions.')
  })

  it('caches identical expressions regardless of path', async () => {
    let callCount = 0
    const seenExpressions = new Set()
    const cachingCallback = (attributes, path, key, args) => {
      // Create an expression identifier that ignores path
      const expressionId = `${key}:${args.join(',')}`

      if (!seenExpressions.has(expressionId)) {
        callCount++
        seenExpressions.add(expressionId)
      }

      return `result-${expressionId}`
    }

    const yamlWithDuplicateExpressions = tempYamlFile({ value1: '${{ test arg1 }}', value2: '${{ test arg1 }}' })
    const result = await loadFile(yamlWithDuplicateExpressions, cachingCallback)

    // Both values should be the same since they use the same expression (key + args)
    expect(result.value1).toBe('result-test:arg1')
    expect(result.value2).toBe('result-test:arg1')
    expect(callCount).toBe(1)
    expect(seenExpressions.size).toBe(1)
  })

  it('handles multiple embedded expressions', async () => {
    yaml = tempYamlFile({ value1: 'value1', value2: 'value2', value3: 'value1 is ${{ get value1 }} and value2 is ${{ get value2 }}' })
    const result = await loadFile(yaml, expressionCallback)
    expect(result.value3).toBe('value1 is value1 and value2 is value2')
  })
})
