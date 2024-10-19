import { writeFileSync, existsSync, mkdirSync, statSync } from 'fs'
import { cacheDir as _cacheDir, exit, flattenObject, deepForEach, verifyFile, resolve } from '~/utils'
import { StaxConfig, CompileOptions, DefaultCompileOptions } from '~/types'
import { renderTemplate, parseTemplateExpression } from './template'
import { dump, loadFile } from './yaml'
import yaml from 'js-yaml'
import Config from './config'
import DockerfileCompiler from './dockerfile_compiler'
import Expressions from './expressions'
import Location from '~/location'
import icons from '~/icons'
import * as path from 'path'

export default class Staxfile {
  public config: Config
  public compose: Record<string, any>
  public warnings: Set<string>
  public cacheDir: string
  private buildsCompiled: Record<string, string> = {}
  private expressions: Expressions

  constructor(config: StaxConfig, options: { cacheDir?: string } = {}) {
    let source = config.source

    if (source.endsWith("/Staxfile"))
      source = source.slice(0, -9)

    this.config = new Config({ ...config, source: source })
    this.cacheDir = options.cacheDir || this.systemCacheDir
    this.warnings = new Set()
    this.expressions = new Expressions(this)
  }

  get staxfile(): string { return this.config.staxfile }
  get context(): string { return this.config.context}
  get app(): string { return this.config.app }
  get source(): string { return this.config.source }
  get location(): Location { return this.config.location }
  get baseDir(): string { return path.dirname(resolve(this.staxfile))}

  private get systemCacheDir(): string {
    const cacheDir = _cacheDir(this.context, this.app)

    if (!existsSync(cacheDir))
      mkdirSync(cacheDir, { recursive: true })

    return cacheDir
  }

  public get cachedComposeFile(): string | null {
    return path.join(this.cacheDir, 'compose.yaml')
  }

  public async compile(options: CompileOptions = {}): Promise<string> {
    options = { ...DefaultCompileOptions, ...options }
    const composeFile = this.cachedComposeFile

    if (!options.force && existsSync(composeFile)) {
      const cachedStats = statSync(composeFile)
      const staxfileStats = statSync(this.staxfile)

      if (cachedStats.mtime > staxfileStats.mtime)
        return composeFile
    }

    console.log(`${icons.build}  Compiling ${this.staxfile}`)

    await this.insideBaseDir(async () => {
      await this.load(options)
      writeFileSync(composeFile, this.normalizedYaml())
    })
    return composeFile
  }

  private async insideBaseDir(callback: () => Promise<void>): Promise<void> {
    const cwd = process.cwd()

    try {
      process.chdir(this.baseDir)
      await callback()
    } finally {
      process.chdir(cwd)
    }
  }

  private async load(options: CompileOptions = {}): Promise<void> {
    options = { ...DefaultCompileOptions, ...options }

    this.warnings = new Set<string>()
    this.compose = loadFile(this.staxfile)

    if (options.excludes.includes('prompts'))
      this.keepExistingPromptValues()

    // render the stax section first since we need to update this.config with the values there
    // exclude read on this first render since it can be dependent on stax.source
    this.compose.stax = await this.renderCompose(this.compose.stax, { excludes: [ 'read' ] })
    this.config = new Config({ ...this.config, ...this.compose.stax })

    this.compose = await this.renderCompose(this.compose)
    this.updateServices()

    // need to re-render after updating services since template expressions may have been added
    this.compose = await this.renderCompose(this.compose)

    if (this.generatedWarnings.length > 0)
      return exit(1, { message: this.generatedWarnings.join('\n') })
  }

  // set all prompts to it's current config value or default if it is being excluded
  private keepExistingPromptValues() {
    deepForEach(this.compose, (path, value) => {
      if (typeof value === 'string' && value.includes('prompt')) {
        const expression = parseTemplateExpression(value)

        if (expression.funcName === 'prompt')
          return this.config.fetch(path) || expression.args[expression.args.length - 1]
      }
      return value
    })
  }

  private get generatedWarnings(): Array<string> {
    return [...this.warnings]
  }

  private async renderCompose(attributes: Record<string, any>, options: CompileOptions = { excludes: [] }): Promise<Record<string, any>> {
    const renderedYaml = await this.render(dump(attributes), options)
    return yaml.load(renderedYaml)
  }

  private async render(text: string, options: CompileOptions = { excludes: [] }): Promise<string> {
    let matches = 0

    text = await renderTemplate(text, async (name, args, originalMatch) => {
      if (options.excludes.includes(name))
        return originalMatch

      matches += 1
      return await this.expressions.evaluate(name, args)
    })

    return matches > 0 ? await this.render(text, options) : text
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
      labels[`stax.${key}`] = value && typeof value === 'object' ? JSON.stringify(value) : value

    return labels
  }

  private updateHooks(labels) {
    const hooks = [ 'after_setup' ]

    for (const hook of hooks) {
      if (labels[`stax.${hook}`]) {
        if (existsSync(labels[`stax.${hook}`])) {
          const file = resolve(labels[`stax.${hook}`])
          verifyFile(file, `Hook file not found for '${hook}'`)
          labels[`stax.${hook}`] = file
        }
      }
    }
    return labels
  }

  private compileBuild(build) {
    const original = build.dockerfile

    if (this.buildsCompiled[original])
      return build

    build.modules = this.normalizeModules(build.modules)

    const dockerfilePath = path.join(this.cacheDir, original.split(path.sep).slice(-2).join('-'))
    build.dockerfile = new DockerfileCompiler(build).compile(dockerfilePath)
    delete build.modules

    this.buildsCompiled[original] = build.dockerfile
    return build
  }

  private normalizeModules(modules) {
    if (!modules)
      return []

    return modules.map((module) => {
      if (typeof module === 'string')
        module = { name: module, if: true }

      if (!module.hasOwnProperty('name'))
        return exit(1, { message: `${icons.error} Module must have a 'name' property: ${module}` })

      return module
    }).filter(Boolean)
  }

  private normalizedYaml(): string {
    const validTopLevelKeys = [ 'version', 'services', 'networks', 'volumes', 'configs', 'secrets' ]
    const normalizedCompose = Object.entries(this.compose)
      .filter(([key]) => validTopLevelKeys.includes(key))
      .reduce((acc, [key, value]) => {
        acc[key] = value
        return acc
      }, {})
    return dump(normalizedCompose)
  }
}
