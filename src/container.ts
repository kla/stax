import { existsSync } from 'fs'
import { SetupOptions, StaxConfig, RunOptions } from '~/types'
import { run } from '~/shell'
import { linkSshAuthSock } from '~/host_services'
import { timeAgo } from '~/utils'
import docker from '~/docker'
import Staxfile from '~/staxfile'
import App from './app'
import Config from './staxfile/config'
import icons from './icons'

export default class Container {
  public attributes: Record<string, any>

  private _config: Config | undefined
  private _composeFile: string | undefined

  constructor(attributes: Record<string, any>) {
    this.attributes = attributes
  }

  get labels(): Record<string, string> {
    return this.attributes.Config.Labels
  }

  get config(): Config {
    return this._config || (this._config = new Config(this.labels))
  }

  get id(): string {
    return this.attributes.Id
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
    return this.attributes.Name.slice(1)
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

  get status(): string {
    return this.attributes.State.Status
  }

  get health(): string {
    return this.attributes.State?.Health?.Status
  }

  get state(): string {
    if (this.running) {
      if (this.health?.includes('unhealthy')) return 'unhealthy'
      if (this.health?.includes('healthy')) return 'healthy'
    }
    return this.status
  }

  get running(): boolean {
    return this.attributes.State?.Running
  }

  get uptime(): string {
    if (!this.running || !this.attributes.State?.StartedAt) return null

    const startedAt = new Date(this.attributes.State.StartedAt)
    const now = new Date()
    const uptimeMs = now.getTime() - startedAt.getTime()

    return timeAgo(uptimeMs)
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
    const ports: string[] = []
    const networkPorts = this.attributes.NetworkSettings?.Ports || {}

    for (const [containerPort, bindings] of Object.entries(networkPorts)) {
      if (!bindings) continue

      const [containerPortNumber] = containerPort.split('/')
      for (const binding of bindings) {
        const { HostIp, HostPort } = binding
        const hostPortInfo = HostIp === '0.0.0.0' || HostIp === '::' || HostIp === '' ? HostPort : `${HostIp}:${HostPort}`

        if (HostPort === containerPortNumber)
          ports.push(hostPortInfo)
        else
          ports.push(`${hostPortInfo}->${containerPortNumber}`)
      }
    }

    return [...new Set(ports)]
  }

  get ipAddresses(): string[] {
    return (Object.values(this.attributes.NetworkSettings?.Networks) || []).map(network => network['IPAddress'])
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

  async exec(command: string, options: RunOptions = {}) {
    const args = process.stdout.isTTY ? '--interactive --tty' : ''

    linkSshAuthSock()

    if (this.running)
      return docker.container(`exec ${args} ${this.containerName} ${command}`, options)
    return docker.compose(this.context, `run --rm ${args} ${this.name} ${command}`, this.composeFile, options)
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
