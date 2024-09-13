import { readFileSync, writeFileSync, existsSync } from 'fs'
import { exit, flattenObject, getNonNullProperties, makeTempFile, verifyFile } from '~/utils'
import { StaxConfig } from '~/types'
import { renderTemplate } from './template'
import Config from './config'
import DockerfileCompiler from './dockerfile_compiler'
import Location from '~/location'
import icons from '~/icons'
import path from 'path'
import yaml from 'js-yaml'

export default class Staxfile {
  public config: Config
  public compose: Record<string, any>
  private buildsCompiled: Record<string, string> = {}
  private warnings: Set<string>

  constructor(config: StaxConfig) {
    this.config = new Config(config)
  }

  get staxfile(): string { return this.config.staxfile }
  get context(): string { return this.config.context}
  get app(): string { return this.config.app }
  get source(): string { return this.config.source }
  get location(): Location { return this.config.location }
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
    this.warnings = new Set<string>
    this.compose = yaml.load(readFileSync(this.staxfile))

    // want this.config to override anything in compose.stax except for non-null values
    this.config = new Config({ ...this.compose.stax, ...getNonNullProperties(this.config) })
    this.compose = this.renderCompose()
    this.updateServices()
    this.compose = this.renderCompose() // need to re-render after updating services since template expressions may have been added

    if (this.generatedWarnings.length > 0)
      exit(1, this.generatedWarnings.join('\n'))
  }

  private get generatedWarnings(): Array<string> {
    return [...this.warnings]
  }

  private renderCompose(): Record<string, any> {
    return yaml.load(this.render(yaml.dump(this.compose, { lineWidth: -1 })))
  }

  private render(text): string {
    let matches = 0

    text = renderTemplate(text, (name, args) => {
      matches += 1

      if (name.startsWith('stax.')) return this.fetchConfigValue(name)
      else if (name === 'read') return this.read(args[0], args[1])
      else if (name == 'mount_workspace') return this.mountWorkspace()
      else if (name == 'path.resolve') return path.resolve(args[0])
      else if (name == 'user') return process.env.USER
      else if (name == 'user_id') return process.getuid()
      else this.warnings.add(`Invalid template expression: ${name}`)
    })

    return matches > 0 ? this.render(text) : text
  }

  private read(file, defaultValue) {
    try {
      return (this.location.readSync(file) || defaultValue).trim()
    } catch (e) {
      console.warn(`${icons.warning}  Couldn't read ${file}: ${e.code}... using default value of '${defaultValue}'`)
      return defaultValue
    }
  }

  private mountWorkspace() {
    const src = this.config.location.local ? this.config.source : this.config.workspace_volume
    const dest = this.config.workspace
    return `${src}:${dest}`
  }

  private fetchConfigValue(name) {
    const key = name.slice(5) // strip 'stax.' prefix

    if (!this.config.hasProperty(key)) {
      if (name == 'config.workspace_volume' && !this.location.local)
        this.warnings.add(`A '${name}' name must be defined when setting up from a remote source.`)

      this.warnings.add(`Undefined reference to '${name}'`)
    }

    return this.config.fetch(key)
  }

  private updateServices() {
    const services = {}
    let number = 0

    for (const [name, service] of Object.entries(this.compose.services)) {
      service.image ||= `${this.context}-${this.app}`
      service.container_name = `${this.context}-${this.app}-${name}`
      service.hostname ||= `${this.app}-${name}`

      service.labels = { ...service.labels, ...this.makeLabels(number) }
      service.labels = this.updateHooks(service.labels)

      if (service.build?.dockerfile)
        service.build = this.compileBuild(service.build)

      services[`${this.app}-${name}`] = service
      number += 1
    }

    this.compose.services = services
  }

  private makeLabels(number: number) {
    const labels = { }
    labels['stax.staxfile'] = this.staxfile
    labels['stax.container_number'] = number

    for (const [key, value] of Object.entries(flattenObject(this.config)))
      labels[`stax.${key}`] = value?.toString()

    return labels
  }

  private updateHooks(labels) {
    const hooks = [ 'after_setup' ]

    for (const hook of hooks) {
      if (labels[`stax.hooks.${hook}`]) {
        if (existsSync(labels[`stax.hooks.${hook}`])) {
          const file = path.resolve(labels[`stax.hooks.${hook}`])
          verifyFile(file, `Hook file not found for '${hook}'`)
          labels[`stax.hooks.${hook}`] = file
        }
      }
    }
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
