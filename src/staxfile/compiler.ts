import path from 'path'
import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import DockerfileCompiler from './dockerfile_compiler'

export default class Compiler {
  public staxfile: string
  private data: any

  constructor(staxfile: string) {
    this.staxfile = staxfile
  }

  get baseDir(): string {
    return path.dirname(path.resolve(this.staxfile))
  }

  public compile() {
    this.data = load(readFileSync(this.staxfile, 'utf-8'))
    const cwd = process.cwd()

    try {
      process.chdir(this.baseDir)
      new DockerfileCompiler(this.data.defaults.build).compile()
    } finally {
      process.chdir(cwd)
    }
  }
}
