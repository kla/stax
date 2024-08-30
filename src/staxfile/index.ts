import { readFileSync, writeFileSync } from 'fs'
import { exit, flattenObject, makeTempFile } from '~/utils'
import { StaxfileOptions } from '~/types'
import { renderTemplate } from './template'
import Config from './config'
import DockerfileCompiler from './dockerfile_compiler'
import path from 'path'
import yaml from 'js-yaml'

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

  public compile(): string {
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
    this.compose = yaml.load(this.render(yaml.dump(this.compose, { lineWidth: -1 })))
    this.updateServices()
  }

  private render(text): string {
    let matches = 0

    text = renderTemplate(text, (name, args) => {
      matches += 1

      if (name.startsWith("config.")) {
        const key = name.slice(7)

        if (!this.compose.config.hasOwnProperty(key))
          exit(1, `Undefined reference to '${name}'`)

        return this.compose.config[key]

      } else if (name === "read") {
        const [ file, defaultValue ] = args
        return this.readFromSourceSync(file) || defaultValue
      }
    })

    return matches > 0 ? this.render(text) : text
  }

  private readFromSourceSync(file) {
    return readFileSync(`${this.source}/${file}`, 'utf-8').trim()
  }

  private updateServices() {
    const services = {}

    for (const [name, service] of Object.entries(this.compose.services)) {
      service.image ||= `${this.context}-${this.app}`
      service.container_name = `${this.context}-${this.app}-${name}`
      service.hostname ||= `${this.app}-${name}`

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
