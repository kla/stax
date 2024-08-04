import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import path from 'path'

export default class Compiler {
  public staxfile: string

  constructor(staxfile: string) {
    this.staxfile = staxfile
  }

  public compile() {
    const data = load(readFileSync(this.staxfile, 'utf-8'))
    const cwd = process.cwd()
    const base = path.dirname(path.resolve(this.staxfile))

    try {
      process.chdir(base)
      this.createDockerfile(data.build)
    } finally {
      process.chdir(cwd)
    }
  }

  private createDockerfile(build: any) {
    const base = readFileSync(build.base, 'utf-8')
    console.log(base)
  }
}
