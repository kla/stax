import { readFileSync, mkdirSync, existsSync } from 'fs'
import { capture } from './shell'
import * as path from 'path'

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
  private static clonedRepos = new Set<string>()

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
    const repoDir = this.getRepoDirectory()
    const filePath = path.join(repoDir, file)
    return readFileSync(filePath, 'utf-8')
  }

  private getRepoDirectory(): string {
    const repoName = this.basename.replace(/[^a-zA-Z0-9-_]/g, '_')
    return path.join(process.env.STAX_HOME, 'cache', this.context, 'git', repoName)
  }

  private ensureRepoCloned() {
    const repoDir = this.getRepoDirectory()

    if (GitLocation.clonedRepos.has(repoDir))
      return // Repository already cloned or updated in this process

    if (!existsSync(repoDir)) {
      mkdirSync(repoDir, { recursive: true })
      capture(`git clone --depth 1 "${this.source}" "${repoDir}"`, { silent: false })
    } else {
      try {
        capture('git fetch origin && git reset --hard origin/HEAD', { silent: false, cwd: repoDir })
      } catch (error) {
        process.exit(1)
      }
    }

    GitLocation.clonedRepos.add(repoDir)
  }
}
