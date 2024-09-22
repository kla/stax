import { readFileSync, mkdirSync, existsSync } from 'fs'
import { capture } from './shell'
import * as path from 'path'
import App from './app'
import Container from './container'

export default class Location {
  public context: string
  public app: string
  public source: string

  constructor(context: string, app: string, source: string) {
    this.context = context
    this.app = app
    this.source = source
  }

  static isGitUrl(url: string): boolean {
    return url && (url.startsWith('git@') || url.startsWith('https://'))
  }

  static from(context: string, app: string, location: string): Location {
    if (this.isGitUrl(location)) {
      // if the container already exists we can use ContainerLocation
      const containerLocation = new ContainerLocation(context, app, location)
      return containerLocation.container ? containerLocation : new GitLocation(context, app, location)
    }

    return new Location(context, app, location && path.resolve(location))
  }

  get basename(): string {
    return path.basename(this.source)
  }

  get local(): boolean {
    return true
  }

  readSync(file: string): string {
    return readFileSync(path.join(this.source, file), 'utf-8')
  }
}

class GitLocation extends Location {
  private static clonedRepos = new Set<string>()

  get local(): boolean {
    return false
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
    return path.join(process.env.STAX_HOME, 'cache', this.context, '.git', repoName)
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

// Copy files from a container
class ContainerLocation extends GitLocation {
  private _container: Container

  get local(): boolean {
    return false
  }

  get container(): Container {
    return this._container ||= App.find(this.context, this.app, { mustExist: false })?.primary
  }

  readSync(file: string): string {
    file = path.join(this.container.config.workspace, file)
    return capture(`docker container exec ${this.container.containerName} cat "${file}"`)
  }
}
