import { readFileSync, writeFileSync } from 'fs'
import { exit, flattenObject, makeTempFile } from '~/utils'
import { StaxfileOptions } from '~/types'
import Config from './config'
import path from 'path'
import yaml from 'js-yaml'
import DockerfileCompiler from './dockerfile_compiler'

export default class Staxfile {
  public config: Config
  public compose: Record<string, any>
  private buildsCompiled: Record<string, string> = {}

  constructor(config: StaxfileOptions) {
    this.config = new Config(config)
  }

  get staxfile(): string { return this.config.staxfile }
  get context(): string { return this.config.context}
  get app(): string { return this.config.app }
  get source(): string { return this.config.source }
  get baseDir(): string { return path.dirname(path.resolve(this.staxfile))}

  public compile(print: boolean = false): string {
    const composeFile = this.tempFile('compose')

    this.insideBaseDir(() => {
      this.load()
      writeFileSync(composeFile, this.normalizedYaml())
    })
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
    this.compose.config = { ...this.compose.config, ...this.config }
    this.compose = this.interpolate(this.compose)
    this.updateServices()
  }

  private interpolate(compose) {
    const regex = /\${{[\s]*config\.([\w]+)[\s]*}}/g
    let dump = yaml.dump(compose, { lineWidth: -1 })

    dump = dump.replace(regex, (name, key) => {
      if (!compose.config.hasOwnProperty(key))
        exit(1, `Undefined reference to '${name}'`)

      return compose.config[key]
    })

    compose = yaml.load(dump)
    return dump.match(regex) ? this.interpolate(compose) : compose
  }

  private updateServices() {
    const services = {}

    for (const [name, service] of Object.entries(this.compose.services)) {
      service.image ||= `${this.context}-${this.app}`
      service.container_name = `${this.context}-${this.app}-${name}`
      service.hostname ||= `${this.app}-${name}`

      service.environment ||= {}
      service.environment.STAX_APP_NAME = this.app
      service.labels = this.makeLabels(service.labels)

      if (service.build?.dockerfile)
        service.build = this.compileBuild(service.build)

      services[`${this.app}-${name}`] = service
    }

    this.compose.services = services
  }

  private makeLabels(labels) {
    labels = structuredClone(labels || {})
    labels['stax.staxfile'] = this.staxfile

    for (const [key, value] of Object.entries(flattenObject(this.compose.config)))
      labels[`stax.${key}`] = value.toString()

    return labels
  }

  private compileBuild(build) {
    const original = build.dockerfile

    if (this.buildsCompiled[original])
      return build

    build.args ||= {}
    build.args.STAX_APP_NAME = this.app
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
