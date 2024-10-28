import { afterEach, mock } from 'bun:test'
import { expressionsCache } from '~/yamler'

afterEach(() => {
  // Add manual cleanup of any existing tmp files
  mock.restore()
  Object.keys(expressionsCache).forEach(key => delete expressionsCache[key])
})
