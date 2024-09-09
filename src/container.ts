import { existsSync } from 'fs'
import { csvKeyValuePairs, exit } from '~/utils'
import { FindOptions, SetupOptions, StaxConfig } from '~/types'
import { run } from '~/shell'
import { verifyFile } from './utils'
import docker from '~/docker'
import Staxfile from '~/staxfile'
import App from './app'
import Config from './staxfile/config'
import icons from './icons'

export default class Container {
  public attributes: Record<string, any>

  private _labels: Record<string, string> | undefined
  private _config: Config | undefined
  private _composeFile: string | undefined

  constructor(attributes: Record<string, any>) {
    this.attributes = attributes
  }

  get labels(): Record<string, string> {
    return this._labels ? this._labels : (this._labels = csvKeyValuePairs(this.attributes.Labels))
  }

  get config(): Config {
    if (!this._config) {
      this._config = new Config()

      for (const [key, value] of Object.entries(this.labels)) {
        if (key.startsWith('stax.'))
          this._config.set(key, value)
      }
    }
    return this._config
  }

  get id(): string {
    return this.attributes.ID
  }

  get staxfile(): string {
    return this.config.staxfile
  }

  get app(): string {
    return this.config.app
  }

  get service(): string {
    return this.labels['com.docker.compose.service'].replace(`${this.app}-`, '')
  }

  get name(): string {
    return this.labels['com.docker.compose.service']
  }

  get containerName(): string {
    return this.attributes.Names
  }

  get context(): string{
    return this.labels['com.docker.compose.project']
  }

  get number(): number {
    return parseInt(this.labels['stax.container_number'], 10) || 0
  }

  get workingDirectory(): string {
    return this.labels['com.docker.compose.project.working_dir']
  }

  get state(): string {
    if (this.attributes.Status.includes('unhealthy')) return 'unhealthy'
    if (this.attributes.Status.includes('healthy')) return 'healthy'
    return this.attributes.State
  }

  get running(): boolean {
    return this.attributes.State == 'running'
  }

  get uptime(): string {
    return this.running ? this.attributes.RunningFor : null
  }

  get source(): string {
    return this.config.source
  }

  /**
   * Returns the docker compose configuration file for the container.
   * @returns The configuration file path.
   */
  get configFile(): string {
    return this.labels['com.docker.compose.project.config_files']
  }

  get composeFile(): string {
    return this._composeFile ||= new Staxfile({ context: this.context, source: this.source, staxfile: this.staxfile, app: this.app }).compile()
  }

  static all(context: string): Container[] {
    return docker.ps(context)
      .map(attributes => new Container(attributes))
      .filter(container => container.context === context)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  static find(context: string, containerName: string, options: FindOptions={}): Container | undefined {
    const c = this.all(context).find(c => c.containerName == containerName)

    if (!c) {
      if (options.warn)
        console.warn(`🤷 Container '${context}/${containerName}' not found`)
      else if (options.mustExist)
        return exit(1, `👿 '${context}/${containerName}' is not a valid container name`)
    }

    return c
  }

  async down() {
    return docker.compose(this.context, `stop ${this.name}`, this.composeFile)
  }

  async up() {
    return docker.compose(this.context, `start ${this.name}`, this.composeFile, { exit: true })
  }

  async remove() {
    return docker.compose(this.context, 'rm --stop --force --volumes', this.composeFile)
  }

  async exec(command: string) {
    const args = '--interactive --tty'

    if (this.running)
      return docker.container(`exec ${args} ${this.containerName} ${command}`)
    return docker.compose(this.context, `run --rm ${args} ${this.name} ${command}`, this.composeFile)
  }

  async rebuild(config: StaxConfig, options: SetupOptions = {}) {
    config = {
      ...this.config,
      ...config,
      // can't change following on a rebuild
      context: this.context, source: this.source, staxfile: this.staxfile, app: this.app
    }

    App.setup(config, { ...options, rebuild: true })
  }

  async shell() {
    const shells = [ '/bin/bash', '/bin/sh' ]
    shells.find(async (shell) => {
      try {
        await this.exec(shell)
        return true
      } catch (e) {
        return false
      }
    })
  }

  async logs(options: { follow?: boolean, tail?: number, since?: string } = {}) {
    let command = `logs ${this.name}`
    if (options.follow) command += ' --follow'
    if (options.tail) command += ` --tail=${options.tail}`
    if (options.since) command += ` --since=${options.since}`
    return docker.compose(this.context, command, this.composeFile)
  }

  async restart() {
    return docker.compose(this.context, `restart ${this.name}`, this.composeFile)
  }

  async runHook(type) {
    let hook = this.labels[`stax.hooks.${type}`]
    if (!hook) return

    if (existsSync(hook))
      run(`cat ${hook} | docker container exec --interactive ${this.containerName} /bin/sh`)
    else
      run(hook)
  }

  async copy(source: string, destination: string, options: { dontOverwrite?: boolean } = {}) {
    verifyFile(source)

    const { dontOverwrite = false } = options
    const isDirectory = source.endsWith('/')
    const destinationIsDirectory = destination.endsWith('/')
    const sourceParts = source.split('/')
    const sourceFileName = sourceParts[sourceParts.length - 1]

    let destPath = destination
    if (destinationIsDirectory && !isDirectory)
      destPath += sourceFileName

    if (dontOverwrite && docker.fileExists(this.containerName, destPath)) {
      console.warn(`${icons.warning}  Not copying ${source} because it already exists at ${destPath}`)
      return
    }

    docker.container(`cp ${source} ${this.containerName}:${destPath}`)
  }

  async get(source, destination) {
    return docker.container(`cp ${this.containerName}:${source} ${destination}`)
  }
}
