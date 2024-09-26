import { existsSync } from 'fs'
import { csvKeyValuePairs } from '~/utils'
import { SetupOptions, StaxConfig } from '~/types'
import { run } from '~/shell'
import { linkSshAuthSock } from '~/host_services'
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
    return this._config || (this._config = new Config(this.labels))
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
    return this._composeFile ||= new Staxfile({ context: this.context, source: this.source, staxfile: this.staxfile, app: this.app }).cachedComposeFile
  }

  get forwardedPorts(): string[] {
    const ports = this.attributes.Ports
      ?.split(',')
      .map(port => port.trim())
      .filter(port => port.includes('->'))
      .map(port => {
        port = port.replace(':::', '0.0.0.0:')
        const [hostPart, containerPart] = port.split('->')
        const [bindAddress, hostPort] = hostPart.split(':')
        const containerPort = containerPart.split('/')[0] // Remove the protocol part
        const hostPortInfo = bindAddress === '0.0.0.0' ? hostPort : `${bindAddress}:${hostPort}`

        if (hostPort === containerPort)
          return hostPortInfo

        return `${hostPortInfo}->${containerPort}`
      }) || []

    return [...new Set(ports)]
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

    linkSshAuthSock()

    if (this.running)
      return docker.container(`exec ${args} ${this.containerName} ${command}`)
    return docker.compose(this.context, `run --rm ${args} ${this.name} ${command}`, this.composeFile)
  }

  async rebuild(config: StaxConfig, options: SetupOptions = {}) {
    config = {
      ...this.config,
      ...config,
      // can't change following on a rebuild
      context: this.context, source: this.source, staxfile: this.staxfile
    }

    App.setup(config, { ...options, rebuild: true })
  }

  async shell() {
    const shells = ['/bin/zsh', '/bin/bash']
    const shellCommand = `sh -c '${shells.map(shell => `[ -f ${shell} ] && exec ${shell}`).join(' || ')} || exec /bin/sh'`

    try {
      await this.exec(shellCommand)
    } catch (e) {
      console.error('Failed to start a shell:', e)
    }
  }

  async logs(options: { follow?: boolean, tail?: number, since?: string } = {}) {
    let command = `logs ${this.name}`

    if (options.follow) command += ' --follow'
    if (options.tail) command += ` --tail=${options.tail}`
    if (!options.since) options.since = '10m'
    if (options.since) command += ` --since=${options.since}`
    return docker.compose(this.context, command, this.composeFile)
  }

  async restart() {
    return docker.compose(this.context, `restart ${this.name}`, this.composeFile)
  }

  async runHook(type) {
    let hook = this.labels[`stax.${type}`]
    if (!hook) return

    if (existsSync(hook))
      run(`cat ${hook} | docker container exec --interactive ${this.containerName} /bin/sh`)
    else
      run(hook)
  }

  async copy(source: string, destination: string, options: { dontOverwrite?: boolean } = {}) {
    if (!existsSync(source)) {
      console.warn(`${icons.warning}  Couldn't copy '${source}' because it does not exist`)
      return
    }

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
