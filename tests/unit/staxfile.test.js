import { describe, it, expect, beforeEach } from 'bun:test'
import { mkdirSync,rmSync } from 'fs'
import Staxfile from '~/staxfile'
import path from 'path'

describe('Staxfile', () => {
  let staxfile
  const cacheDir = path.join(__dirname, '../../tmp/tests-staxfile-cache')

  beforeEach(() => {
    rmSync(cacheDir, { recursive: true, force: true })
    mkdirSync(cacheDir, { recursive: true })
    staxfile = new Staxfile({ context: 'tests', source: './tests/fixtures', staxfile: './tests/fixtures/some_service.staxfile' }, { cacheDir })
  })

  it('compiles', async () => {
    staxfile.compile({ force: true })
    console.log(staxfile.config)
  })
})
