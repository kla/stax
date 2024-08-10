import { readFileSync, writeFileSync } from 'fs'
import { load } from 'js-yaml'
import { exit, fileExists } from '~/utils'
import path from 'path'
import tmp from 'tmp'
import Dockerfile from './dockerfilex'

export default class Compiler {
  public staxfile: string
  public config: any
  public baseDir: string

  constructor(staxfile: string) {
    if (!fileExists(staxfile))
      exit(1, `Staxfile not found: ${staxfile}`)

    this.staxfile = staxfile
    this.config = load(readFileSync(this.staxfile, 'utf-8'))
    this.baseDir = path.dirname(path.resolve(this.staxfile))

    tmp.setGracefulCleanup()
  }

  public compile() {
    const files = { dockerfile: undefined, compose: undefined }

    this.insideBaseDir(() => {
      files.dockerfile = this.compileDockerfile()
    })
    console.log(files)
    return files
  }

  private insideBaseDir(callback) {
    const cwd = process.cwd()

    try {
      process.chdir(this.baseDir)
      return callback()
    } finally {
      process.chdir(cwd)
    }
  }

  private compileDockerfile(): string {
    const dockerfile = new Dockerfile(this.config.defaults.build).compile()
    const file = tmp.fileSync({ tmpdir: this.baseDir, postfix: 'dockerfile' })

    writeFileSync(file.name, dockerfile)
    return file.name
  }
}
