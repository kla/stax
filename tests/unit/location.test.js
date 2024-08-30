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

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true })
    writeFileSync(path.join(testDir, testFile), testContent)
  })

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  it('should create a Location instance', () => {
    const location = new Location(testDir)
    expect(location).toBeInstanceOf(Location)
    expect(location.source).toBe(testDir)
  })

  it('should read file content synchronously', () => {
    const location = new Location(testDir)
    const content = location.readSync(testFile)
    expect(content).toBe(testContent)
  })

  it('should create a Location instance from a non-git source', () => {
    const location = Location.from(testDir)
    expect(location).toBeInstanceOf(Location)
    expect(location.source).toBe(testDir)
  })

  it('should throw an error when reading a non-existent file', () => {
    const location = new Location(testDir)
    expect(() => location.readSync('non-existent.txt')).toThrow()
  })

  it('returns the correct basename for a local path', () => {
    const location = new Location('/path/to/my-project')
    expect(location.basename).toBe('my-project')
  })
})

describe('Git-based Location', () => {
  it('returns the correct basename for an http Git URL', () => {
    expect(Location.from('https://github.com/user/repo-name.git').basename).toBe('repo-name')
    expect(Location.from('https://github.com/user/repo-name').basename).toBe('repo-name')
  })

  it('returns the correct basename for an SSH Git URL', () => {
    Location.from = Location.from
    const location = Location.from('git@github.com:user/repo-name.git')
    expect(location.basename).toBe('repo-name')
  })

  describe('mocked', () => {
    const mockGitUrl = 'https://github.com/octocat/Hello-World.git'
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

    it('should create a Location instance from a git URL', () => {
      mockFrom.mockImplementation((source) => new Location(source))
      const location = Location.from(mockGitUrl)
      expect(location).toBeInstanceOf(Location)
      expect(location.source).toBe(mockGitUrl)
      expect(mockFrom).toHaveBeenCalledWith(mockGitUrl)
    })

    it('should reuse existing cloned repository', () => {
      mockFrom.mockImplementation((source) => {
        const location = new Location(source)
        mockRepoDirectories.set(source, location)
        return location
      })

      const location1 = Location.from(mockGitUrl)
      const location2 = Location.from(mockGitUrl)

      expect(mockRepoDirectories.get(mockGitUrl)).toBeDefined()
      expect(mockRepoDirectories.size).toBe(1)
      expect(mockFrom).toHaveBeenCalledTimes(2)
    })
  })
})
