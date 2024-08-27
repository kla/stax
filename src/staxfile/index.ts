import { readFileSync, writeFileSync } from 'fs'
import { exit, isDirectory, fileExists, flattenObject, makeTempFile, verifyFile } from '~/utils'
import path from 'path'
import yaml from 'js-yaml'
import DockerfileCompiler from './dockerfile_compiler'

export interface StaxfileOptions {
  contextName: string
  source: string
  staxfile?: string
  appName?: string
}

export default class Staxfile {
  public staxfile: string
  public contextName: string
  public appName: string
  public source: string
  public compose: Record<string, any>
  private buildsCompiled: Record<string, string> = {}

  constructor(options: StaxfileOptions) {
    this.contextName = options.contextName
    this.source = options.source
    this.staxfile = options.staxfile || this.findStaxfile(this.source)
    this.appName = options?.appName || path.basename(this.source)

    verifyFile(this.staxfile, `Staxfile not found: ${this.staxfile}`)
    this.source = path.resolve(this.source)
    this.staxfile = path.resolve(this.staxfile)
  }

  get baseDir(): string {
    return path.dirname(path.resolve(this.staxfile))
  }

  public compile(print: boolean = false): string {
    const composeFile = this.tempFile('compose')

    this.insideBaseDir(() => {
      this.load()
      writeFileSync(composeFile, this.normalizedYaml())
    })

    if (print) {
      for (const [serviceName, dockerfilePath] of Object.entries(this.buildsCompiled)) {
        console.log(`\n# Dockerfile for ${serviceName}:`);
        console.log(readFileSync(dockerfilePath, 'utf-8'));
      }

      console.log('# compose.yaml')
      console.log(readFileSync(composeFile, 'utf-8'))
    }
    return composeFile
  }

  private findStaxfile(path): string {
    if (isDirectory(path)) {
      const files = [ 'Staxfile', 'compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml' ].map(file => `${path}/${file}`)
      path = files.find(file => fileExists(file))
    }
    return path
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

  private load() {
    this.compose = yaml.load(readFileSync(this.staxfile))
    this.compose.stax ||= {}
    this.compose.stax.app ||= path.basename(this.source)
    this.compose.stax.source = this.source
    this.compose = this.interpolate(this.compose)
    this.updateServices()
  }

  private interpolate(compose) {
    const regex = /\${{[\s]*stax\.([\w]+)[\s]*}}/g
    let dump = yaml.dump(compose, { lineWidth: -1 })

    dump = dump.replace(regex, (name, key) => {
      if (!compose.stax.hasOwnProperty(key))
        exit(1, `Undefined reference to '${name}'`)

      return compose.stax[key]
    })

    compose = yaml.load(dump)
    return dump.match(regex) ? this.interpolate(compose) : compose
  }

  private updateServices() {
    const services = {}

    for (const [name, service] of Object.entries(this.compose.services)) {
      service.image ||= `${this.contextName}-${this.appName}`
      service.container_name = `${this.contextName}-${this.appName}-${name}`
      service.hostname ||= `${this.appName}-${name}`

      service.environment ||= {}
      service.environment.STAX_APP_NAME = this.appName
      service.labels = this.makeLabels(service.labels)

      if (service.build?.dockerfile)
        service.build = this.compileBuild(service.build)

      services[`${this.appName}-${name}`] = service
    }

    this.compose.services = services
  }

  private makeLabels(labels) {
    labels = structuredClone(labels || {})
    labels['stax.staxfile'] = this.staxfile

    for (const [key, value] of Object.entries(flattenObject(this.compose.stax)))
      labels[`stax.${key}`] = value.toString()

    return labels
  }

  private compileBuild(build) {
    const original = build.dockerfile

    if (this.buildsCompiled[original])
      return build

    build.args ||= {}
    build.args.STAX_APP_NAME = this.appName
    build.dockerfile = new DockerfileCompiler(build).compile(this.tempFile('dockerfile'))
    delete build.modules

    this.buildsCompiled[original] = build.dockerfile
    return build
  }

  private normalizedYaml(): string {
    const validTopLevelKeys = [ 'version', 'services', 'networks', 'volumes', 'configs', 'secrets' ]
    const normalizedCompose = Object.entries(this.compose)
      .filter(([key]) => validTopLevelKeys.includes(key))
      .reduce((acc, [key, value]) => {
        acc[key] = value
        return acc
      }, {})

    return yaml.dump(normalizedCompose, { lineWidth: -1, noRefs: true })
  }
}
