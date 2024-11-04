import { afterEach, mock } from 'bun:test'
import { evaluatorCache } from '~/staxfile/evaluator'

afterEach(() => {
  // Add manual cleanup of any existing tmp files
  mock.restore()
  evaluatorCache.clear()
})
