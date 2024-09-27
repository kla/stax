import { afterEach, mock } from 'bun:test'
import Expressions from '~/staxfile/expressions'

afterEach(() => {
  mock.restore()
  Expressions.clearCache()
})
