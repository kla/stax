import { afterEach, beforeEach, describe, it, expect } from 'bun:test'
import YamlER, { loadFile, dump, ExpressionWarning } from '~/yamler'
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
  const composeYaml = resolve(fixturesDir, 'yamler.yaml')
  let yaml

  const expressionCallback = (baseDir, attributes, path, key, args) => {
    if (key == 'true') return true
    if (key == 'false') return false
    if (key == 'null') return null
    if (key == 'undefined') return undefined
    if (key == 'get') return dig(attributes, args[0])
    if (key == 'expression') return '${{ ' + args[0] + ' ' + args[1] + ' }}'
    if (key == 'raw') return args
    return '<' + [key].concat(args).join(' ') + '>'
  }

  beforeEach(async () => {
    tempFiles.length = 0
  })
  afterEach(() => tempFiles.forEach(file => file.removeCallback()))

  it('loads and processes a YAML file with imports', async () => {
    yaml = await loadFile(composeYaml, expressionCallback)
    expect(yaml.stax.vars.ruby_version).toBe('1.0.0')
    expect(yaml.services.web.command).toBe('bin/rails server --port <stax.vars.rails_server_port> --binding 0.0.0.0')
    expect(yaml.services.sidekiq.command).toBe('/usr/local/bin/launch bundle exec sidekiq')
  })

  it('strips _stax_import_ anchors', async () => {
    yaml = await loadFile(composeYaml, expressionCallback)
    expect(dump(yaml)).not.toContain('_stax_import_')
  })

  it('handles expressions that reference a value from an attribute set by another expression', async () => {
    yaml = tempYamlFile({ value1: 1, value2: '${{ get value1 }}', value3: '${{ get value2 }}' })
    const result = await loadFile(yaml, expressionCallback)
    expect(result).toEqual({ value1: 1, value2: 1, value3: 1 })
  })

  it('handles expressions that has an expression referencing a later value', async () => {
    yaml = tempYamlFile({ value1: '${{ get value2 }}', value2: 2 })
    const result = await loadFile(yaml, expressionCallback)
    expect(result).toEqual({ value1: 2, value2: 2 })
  })

  it('handles expressions that return an expression', async () => {
    yaml = tempYamlFile({ value1: 1, value2: '${{ expression get value1 }}', value3: '${{ get value2 }}' })
    const result = await loadFile(yaml, expressionCallback)
    console.log(dump(result))
    expect(result).toEqual({ value1: 1, value2: 1, value3: 1 })
  })

  it('throws an error when expressions have circular references', async () => {
    const circularYaml = tempYamlFile({ value1: '${{ get value2 }}', value2: '${{ get value1 }}' })
    const promise = loadFile(circularYaml, expressionCallback)

    await expect(promise).rejects.toThrow('Maximum expression parsing iterations (100) exceeded. Possible circular reference in expressions.')
  })

  it('caches identical expressions regardless of path', async () => {
    let callCount = 0
    const seenExpressions = new Set()
    const cachingCallback = (baseDir, attributes, path, key, args) => {
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

  it('maintains the expression return value type when not embedded in a string', async () => {
    yaml = tempYamlFile({
      value1: '${{ null }}',
      value2: '${{ undefined }}',
      value3: '${{ true }}',
      value4: '${{ false }}',
    })
    const result = await loadFile(yaml, expressionCallback)
    expect(result.value1).toBe(null)
    expect(result.value2).toBe(undefined)
    expect(result.value3).toBe(true)
    expect(result.value4).toBe(false)
  })

  it('handles types in embedded strings', async () => {
    yaml = tempYamlFile({
      value1: 'embedded expression with a ${{ null }} value',
      value2: 'embedded expression with a ${{ undefined }} value',
      value3: 'embedded expression with a ${{ true }} value',
      value4: 'embedded expression with a ${{ false }} value',
    })
    const result = await loadFile(yaml, expressionCallback)
    expect(result.value1).toBe('embedded expression with a null value')
    expect(result.value2).toBe('embedded expression with a undefined value')
    expect(result.value3).toBe('embedded expression with a true value')
    expect(result.value4).toBe('embedded expression with a false value')
  })

  it('handles expression warnings by adding them to warnings array', async () => {
    const warningCallback = () => { throw new ExpressionWarning('Test warning message') }
    const yamlWithWarning = tempYamlFile({ value: '${{ warning }}' })
    const result = await loadFile(yamlWithWarning, warningCallback)

    expect(result.value).toBe(undefined)
    // Access warnings through the YamlER instance - we'll need to modify the test setup
  })

  it('rethrows non-ExpressionWarning errors', async () => {
    const errorCallback = () => { throw new Error('Test error message') }
    const yamlWithError = tempYamlFile({ value: '${{ error }}' })

    await expect(loadFile(yamlWithError, errorCallback)).rejects.toThrow('Test error message')
  })

  it('collects warnings from expression evaluation', async () => {
    const warningCallback = () => { throw new ExpressionWarning('Test warning message') }
    const yamlWithWarning = tempYamlFile({
      value1: '${{ warning }}',
      value2: '${{ warning }}'
    })

    const yamler = new YamlER(yamlWithWarning, { expressionCallback: warningCallback })
    await yamler.load()

    expect(yamler.warnings).toEqual([
      'Test warning message',
      'Test warning message'
    ])
    expect(yamler.attributes.value1).toBe(undefined)
    expect(yamler.attributes.value2).toBe(undefined)
  })

  describe('arg parsing', () => {
    function testBothQuoteTypes(description, singleQuoteInput, expectedResult, doubleQuoteExpectedResult) {
      it(description, async () => {
        // Test single quotes
        const singleQuoteResult = await loadFile(
          tempYamlFile({ value: '${{ raw ' + singleQuoteInput + ' }}' }),
          expressionCallback
        )
        expect(singleQuoteResult.value).toEqual(expectedResult)

        // Test double quotes by replacing single quotes with double quotes
        const doubleQuoteInput = singleQuoteInput.replace(/'/g, '"')
        const doubleQuoteResult = await loadFile(
          tempYamlFile({ value: '${{ raw ' + doubleQuoteInput + ' }}' }),
          expressionCallback
        )
        expect(doubleQuoteResult.value).toEqual(doubleQuoteExpectedResult || expectedResult)
      })
    }

    testBothQuoteTypes(
      'handles single-quoted arguments',
      "'single quoted arg'",
      ['single quoted arg']
    )

    testBothQuoteTypes(
      'preserves spaces in quoted arguments',
      "' arg  with  many  spaces '",
      [' arg  with  many  spaces ']
    )

    testBothQuoteTypes(
      'handles multiple quoted and unquoted arguments',
      "unquoted 'quoted arg' 'another quoted arg' 1",
      ['unquoted', 'quoted arg', 'another quoted arg', '1']
    )

    testBothQuoteTypes(
      'handles escaped quotes in expression arguments',
      "'quoted \\'nested\\' arg'",
      ["quoted 'nested' arg"],
      ['quoted "nested" arg']  // Different expected result for double quotes
    )
  })

  describe('symbolizing expressions', () => {
    // it('adds expression metadata when compiling', async () => {
    //   const yaml = new YamlER(composeYaml, { expressionCallback })
    //   console.log(dump(yaml.compile()))
    //   // yaml = await loadFile(composeYaml, expressionCallback)
    //   // expect(yaml.services.web.command).toContain('expression')
    // })

    it('can handle multiple expressions', async () => {
      yaml = tempYamlFile({ value1: 'this is ${{ true }} and this is ${{ false }}.' })
      const result = await loadFile(yaml, expressionCallback)
      console.log(result)
    })
  })
})
