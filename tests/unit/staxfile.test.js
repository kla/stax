import { describe, it, expect, beforeEach } from 'bun:test'
import { rmSync, mkdirSync } from 'fs'
import { resolve } from '~/utils'
import { dump } from '~/yamler'
import Staxfile from '~/staxfile'
import path from 'path'

const fixturesDir = resolve('tests/fixtures')
const cacheDir = resolve('tmp/tests-staxfile-cache')

describe('Staxfile', () => {
  let staxfile

  beforeEach(async () => {
    rmSync(cacheDir, { recursive: true, force: true })
    mkdirSync(cacheDir, { recursive: true })

    const config = {
      app: 'rails_app',
      context: 'tests',
      source: './tests/fixtures',
      staxfile: path.join(fixturesDir, 'rails_app.staxfile'),
      cache: true
    }
    staxfile = new Staxfile(config, { cacheDir })
    await staxfile.load()
  })

  it('loads the correct app name', async () => {
    // console.log(staxfile)
    // console.log(dump(staxfile.compose))
    // console.log(staxfile)
  })
})
