import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { exit, fileExists } from '~/utils'
import path from 'path'
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
  }

  public compile() {
    this.insideBaseDir(() => {
      const dockerfile = new Dockerfile(this.config.defaults.build).compile()

      console.log(dockerfile)
    })
  }

  private insideBaseDir(callback) {
    const cwd = process.cwd()

    try {
      process.chdir(this.baseDir)
      callback()
    } finally {
      process.chdir(cwd)
    }
  }
}
