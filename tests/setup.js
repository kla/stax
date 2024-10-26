import { afterEach, mock } from 'bun:test'
import Expressions from '~/staxfile/expressions'

afterEach(() => {
  // Add manual cleanup of any existing tmp files
  mock.restore()
  Expressions.clearCache()
})
