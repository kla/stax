import { readFileSync, mkdtempSync, rmSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import path from 'path'
import os from 'os'

export default class Location {
  public context: string
  public source: string

  constructor(context: string, source: string) {
    this.context = context
    this.source = source
  }

  static isGitUrl(url: string): boolean {
    return url && (url.startsWith('git@') || (url.startsWith('https://') && url.endsWith('.git')))
  }

  static from(context: string, location: string): Location {
    return this.isGitUrl(location) ? new GitLocation(context, location) : new Location(context, location && path.resolve(location))
  }

  get basename(): string {
    return path.basename(this.source)
  }

  get local(): boolean {
    return !Location.isGitUrl(this.source)
  }

  get type(): string {
    return this.local ? 'local' : 'remote'
  }

  readSync(file: string): string {
    return readFileSync(path.join(this.source, file), 'utf-8')
  }
}

class GitLocation extends Location {
  private static repoDirectories = new Map<string, string>()

  constructor(context: string, source: string) {
    super(context, source)
  }

  get basename(): string {
    const urlParts = this.source.split('/')
    let repoName = urlParts[urlParts.length - 1]
    return repoName.endsWith('.git') ? repoName.slice(0, -4) : repoName
  }

  readSync(file: string): string {
    this.ensureRepoCloned()
    const tempDir = GitLocation.repoDirectories.get(this.source)!
    const filePath = path.join(tempDir, file)
    return readFileSync(filePath, 'utf-8')
  }

  private ensureRepoCloned() {
    let tempDir = GitLocation.repoDirectories.get(this.source)

    if (!tempDir || !existsSync(tempDir)) {
      tempDir = mkdtempSync(path.join(os.tmpdir(), 'git-clone-'))
      GitLocation.repoDirectories.set(this.source, tempDir)
      execSync(`git clone --depth 1 ${this.source} ${tempDir}`)
    }
  }

  static cleanupRepoDirectories() {
    for (const dir of GitLocation.repoDirectories.values())
      rmSync(dir, { recursive: true, force: true })

    GitLocation.repoDirectories.clear()
  }
}

process.on('exit', GitLocation.cleanupRepoDirectories)
