import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, mock } from 'bun:test'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import path from 'path'
import Location from '~/location'

// Mock the git functionality
const mockFrom = mock(() => ({
  readSync: mock(() => ''),
}))

const mockRepoDirectories = new Map()

describe('Location', () => {
  const testDir = path.join(__dirname, 'test-location')
  const testFile = 'test.txt'
  const testContent = 'Hello, world!'
  const testContext = 'test-context'

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true })
    writeFileSync(path.join(testDir, testFile), testContent)
  })

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  it('creates a Location instance', () => {
    const location = new Location(testContext, testDir)
    expect(location).toBeInstanceOf(Location)
    expect(location.source).toBe(testDir)
    expect(location.context).toBe(testContext)
  })

  it('reads file content synchronously', () => {
    const location = new Location(testContext, testDir)
    const content = location.readSync(testFile)
    expect(content).toBe(testContent)
  })

  it('creates a Location instance from a non-git source', () => {
    const location = Location.from(testContext, testDir)
    expect(location).toBeInstanceOf(Location)
    expect(location.source).toBe(testDir)
    expect(location.context).toBe(testContext)
  })

  it('throws an error when reading a non-existent file', () => {
    const location = new Location(testContext, testDir)
    expect(() => location.readSync('non-existent.txt')).toThrow()
  })

  it('returns the correct basename for a local path', () => {
    const location = new Location(testContext, '/path/to/my-project')
    expect(location.basename).toBe('my-project')
  })
})

describe('Git-based Location', () => {
  const testContext = 'test-context'

  it('returns the correct basename for an http Git URL', () => {
    expect(Location.from(testContext, 'https://github.com/user/repo-name.git').basename).toBe('repo-name')
    expect(Location.from(testContext, 'https://github.com/user/repo-name').basename).toBe('repo-name')
  })

  it('returns the correct basename for an SSH Git URL', () => {
    Location.from = Location.from
    const location = Location.from(testContext, 'git@github.com:user/repo-name.git')
    expect(location.basename).toBe('repo-name')
  })

  describe('mocked', () => {
    const mockGitUrl = 'https://github.com/octocat/Hello-World.git'
    const testContext = 'test-context'
    let originalFrom

    beforeEach(() => {
      // Replace the original from method with our mock
      originalFrom = Location.from
      Location.from = mockFrom
      Location.repoDirectories = mockRepoDirectories
      mockFrom.mockClear()
      mockRepoDirectories.clear()
    })

    afterEach(() => {
      // Restore the original from method after all tests
      Location.from = originalFrom
      delete Location.repoDirectories
    })

    it('creates a Location instance from a git URL', () => {
      mockFrom.mockImplementation((context, source) => new Location(context, source))
      const location = Location.from(testContext, mockGitUrl)
      expect(location).toBeInstanceOf(Location)
      expect(location.source).toBe(mockGitUrl)
      expect(location.context).toBe(testContext)
      expect(mockFrom).toHaveBeenCalledWith(testContext, mockGitUrl)
    })

    it('reuses existing cloned repository', () => {
      mockFrom.mockImplementation((context, source) => {
        const location = new Location(context, source)
        mockRepoDirectories.set(source, location)
        return location
      })

      const location1 = Location.from(testContext, mockGitUrl)
      const location2 = Location.from(testContext, mockGitUrl)

      expect(mockRepoDirectories.get(mockGitUrl)).toBeDefined()
      expect(mockRepoDirectories.size).toBe(1)
      expect(mockFrom).toHaveBeenCalledTimes(2)
    })
  })
})
