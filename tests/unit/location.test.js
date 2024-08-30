import { describe, it, expect, beforeAll, beforeEach, afterAll, mock } from "bun:test"
import { mkdirSync, writeFileSync, rmSync } from "fs"
import path from "path"
import Location from "~/location"

// Mock the git functionality
const mockFrom = mock(() => ({
  source: "",
  readSync: mock(() => ""),
}))

const mockRepoDirectories = new Map()

describe("Location", () => {
  const testDir = path.join(__dirname, "test-location")
  const testFile = "test.txt"
  const testContent = "Hello, world!"

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true })
    writeFileSync(path.join(testDir, testFile), testContent)
  })

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  it("should create a Location instance", () => {
    const location = new Location(testDir)
    expect(location).toBeInstanceOf(Location)
    expect(location.source).toBe(testDir)
  })

  it("should read file content synchronously", () => {
    const location = new Location(testDir)
    const content = location.readSync(testFile)
    expect(content).toBe(testContent)
  })

  it("should create a Location instance from a non-git source", () => {
    const location = Location.from(testDir)
    expect(location).toBeInstanceOf(Location)
    expect(location.source).toBe(testDir)
  })

  it("should throw an error when reading a non-existent file", () => {
    const location = new Location(testDir)
    expect(() => location.readSync("non-existent.txt")).toThrow()
  })
})

describe("Git-based Location", () => {
  const mockGitUrl = "https://github.com/octocat/Hello-World.git"

  beforeEach(() => {
    // Replace the original from method with our mock
    Location.from = mockFrom
    Location.repoDirectories = mockRepoDirectories
    mockFrom.mockClear()
    mockRepoDirectories.clear()
  })

  afterAll(() => {
    // Restore the original from method after all tests
    Location.from = Location.from
    delete Location.repoDirectories
  })

  it("should create a Location instance from a git URL", () => {
    mockFrom.mockImplementation((source) => new Location(source))
    const location = Location.from(mockGitUrl)
    expect(location).toBeInstanceOf(Location)
    expect(location.source).toBe(mockGitUrl)
    expect(mockFrom).toHaveBeenCalledWith(mockGitUrl)
  })

  it("should reuse existing cloned repository", () => {
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
