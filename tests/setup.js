import { beforeEach, afterEach, mock } from 'bun:test'
import { evaluatorCache } from '~/staxfile/evaluator'
import { mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import settings from '~/settings'

process.env.STAX_HOME = join(__dirname, '../tmp/.stax-tests')

beforeEach(() => {
  mkdirSync(process.env.STAX_HOME, { recursive: true })
  settings.write('environment', 'test')
})

afterEach(() => {
  mock.restore()
  evaluatorCache.clear()
  rmSync(process.env.STAX_HOME, { recursive: true, force: true })
})
