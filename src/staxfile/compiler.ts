import { readFileSync } from 'fs'
import { makeTempFile, verifyFile } from '~/utils'
import path from 'path'
import yaml from 'js-yaml'
import DockerfileCompiler from './dockerfile_compiler'
import ComposeGenerator from './compose_generator'

export default class Compiler {
  public staxfile: string
  public config: any
  public baseDir: string

  constructor(staxfile: string) {
    verifyFile(staxfile, 'Staxfile not found')

    this.staxfile = path.resolve(staxfile)
    this.config = yaml.load(readFileSync(this.staxfile, 'utf-8'))
    this.baseDir = path.dirname(path.resolve(this.staxfile))
  }

  public compile(print: boolean = false) {
    const files = { dockerFile: undefined, composeFile: undefined }

    this.insideBaseDir(() => {
      files.dockerFile = new DockerfileCompiler(this.config.defaults.build)
        .compile(this.tempFile('dockerfile'))
      files.composeFile = new ComposeGenerator(this.config, { staxfile: this.staxfile, dockerfile: files.dockerFile })
        .compile(this.tempFile('compose'))
    })

    if (print) {
      console.log('# Dockerfile')
      console.log(readFileSync(files.dockerFile, 'utf-8'))
      console.log('# compose.yaml')
      console.log(readFileSync(files.composeFile, 'utf-8'))
    }
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

  private tempFile(postfix) {
    return makeTempFile(this.baseDir, postfix)
  }
}
