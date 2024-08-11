import { readFileSync, writeFileSync } from 'fs'
import { exit, fileExists } from '~/utils'
import path from 'path'
import tmp from 'tmp'
import yaml from 'js-yaml'
import DockerfileCompiler from './dockerfile_compiler'
import ComposeGenerator from './compose_generator'

export default class Compiler {
  public staxfile: string
  public config: any
  public baseDir: string

  constructor(staxfile: string) {
    if (!fileExists(staxfile))
      exit(1, `Staxfile not found: ${staxfile}`)

    this.staxfile = staxfile
    this.config = yaml.load(readFileSync(this.staxfile, 'utf-8'))
    this.baseDir = path.dirname(path.resolve(this.staxfile))

    tmp.setGracefulCleanup()
  }

  public compile() {
    const files = { dockerFile: undefined, composeFile: undefined }

    this.insideBaseDir(() => {
      files.dockerFile = this.compileDockerfile()
      files.composeFile = this.compileCompose()
    })
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
    const file = tmp.fileSync({ tmpdir: this.baseDir, postfix: 'dockerfile' })
    const dockerfile = new DockerfileCompiler(this.config.defaults.build).compile({ outputFile: file.name})
    this.config.defaults.build.dockerfile = file.name
    return file.name
  }

  private compileCompose(): string {
    const tmpfile = tmp.fileSync({ tmpdir: this.baseDir, postfix: 'compose' })
    const yaml = new ComposeGenerator(this.config).compile({ outputFile: tmpfile.name })
    return tmpfile.name
  }
}
