import { readFileSync, writeFileSync } from 'fs'
import { exit, flattenObject, makeTempFile, verifyFile } from '~/utils'
import path from 'path'
import yaml from 'js-yaml'
import DockerfileCompiler from './dockerfile_compiler'

export default class Staxfile {
  public staxfile: string
  public contextName: string
  public baseDir: string
  public stax: Record<string, any>
  public compose: Record<string, any>
  private buildsCompiled: Record<string, string> = {}

  constructor(contextName: string, staxfile: string) {
    verifyFile(staxfile, 'Staxfile not found')

    this.staxfile = path.resolve(staxfile)
    this.contextName = contextName
    this.baseDir = path.dirname(path.resolve(this.staxfile))
  }

  get appName(): string {
    return this.stax.app
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

    if (!this.compose.stax?.app)
      exit(1, "A 'stax.app' value must be defined!")

    this.stax = this.compose.stax
    delete this.compose.stax

    this.interpolate()
    this.updateServices()
  }

  private interpolate() {
    let dump = yaml.dump(this.compose)

    dump = dump.replace(/\${{[\s]*stax\.([\w]+)[\s]*}}/g, (name, key) => {
      if (!this.stax.hasOwnProperty(key))
        exit(1, `Undefined reference to '${name}'`)

      return this.stax[key]
    })
    this.compose = yaml.load(dump)
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

    for (const [key, value] of Object.entries(flattenObject(this.stax)))
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
    const validTopLevelKeys = [ 'stax', 'version', 'services', 'networks', 'volumes', 'configs', 'secrets' ]
    const normalizedCompose = Object.entries(this.compose)
      .filter(([key]) => validTopLevelKeys.includes(key))
      .reduce((acc, [key, value]) => {
        acc[key] = value
        return acc
      }, {})

    return yaml.dump(normalizedCompose, { lineWidth: -1, noRefs: true })
  }
}
