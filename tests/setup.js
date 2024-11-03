import { afterEach, mock } from 'bun:test'

afterEach(() => {
  // Add manual cleanup of any existing tmp files
  mock.restore()
})
