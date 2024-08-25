import { readFileSync } from 'fs'
import { exit, makeTempFile, verifyFile } from '~/utils'
import path from 'path'
import yaml from 'js-yaml'
import DockerfileCompiler from './dockerfile_compiler'
import ComposeGenerator from './compose_generator'

export default class Staxfile {
  public staxfile: string
  public contextName: string
  public appName: string
  public config: any
  public baseDir: string

  constructor(contextName: string, staxfile: string) {
    verifyFile(staxfile, 'Staxfile not found')

    this.staxfile = path.resolve(staxfile)
    this.contextName = contextName
    this.baseDir = path.dirname(path.resolve(this.staxfile))
    this.loadConfig()
  }

  public compile(print: boolean = false) {
    const files = { dockerFile: undefined, composeFile: undefined }

    this.insideBaseDir(() => {
      if (this.config.defaults?.build) {
        this.config.defaults.build.args ||= {}
        this.config.defaults.build.args.STAX_APP_NAME = this.appName

        files.dockerFile = new DockerfileCompiler(this.config.defaults.build)
          .compile(this.tempFile('dockerfile'))
      }

      files.composeFile = new ComposeGenerator(this.contextName, this.appName, this.config, { staxfile: this.staxfile, dockerfile: files.dockerFile })
        .compile(this.tempFile('compose'))
    })

    if (print) {
      if (files.dockerFile) {
        console.log('# Dockerfile')
        console.log(readFileSync(files.dockerFile, 'utf-8'))
      }

      console.log('# compose.yaml')
      console.log(readFileSync(files.composeFile, 'utf-8'))
    }
    return files
  }

  private loadConfig(): any {
    this.config = yaml.load(readFileSync(this.staxfile, 'utf-8'))
    this.appName = this.config.app

    if (!this.appName)
      exit(1, 'Staxfile must specify the apps name in "app"')

    delete this.config.app
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
