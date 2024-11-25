import { describe, it, expect, beforeEach } from 'bun:test'
import { rmSync, mkdirSync } from 'fs'
import { resolve } from '~/utils'
import { dump } from '~/yamler'
import Staxfile from '~/staxfile'
import path, { join } from 'path'

const fixturesDir = resolve('tests/fixtures')
const cacheDir = resolve('tmp/tests-staxfile-cache')
const services = [ 'rails_app-web', 'rails_app-sidekiq' ]

describe('Staxfile', () => {
  let staxfile

  beforeEach(async () => {
    rmSync(cacheDir, { recursive: true, force: true })
    mkdirSync(cacheDir, { recursive: true })

    const config = {
      app: 'rails_app',
      context: 'tests',
      source: './tests/fixtures',
      staxfile: path.join(fixturesDir, 'rails_app.staxfile'),
      cache: true
    }
    staxfile = new Staxfile(config, { cacheDir })
    await staxfile.load()
  })

  it('generates the correct stax attributes', () => {
    expect(staxfile.compose.stax).toEqual({
      app: 'rails_app',
      workspace: '/workspaces/rails_app',
      vars: {
        ruby_version: '2.0.1',
        rails_server_port: 3000
      },
      requires: [ 'mysql', 'caddy' ],
      with_resolve: fixturesDir,
      with_resolve_relative: join(fixturesDir, 'imports/sub'),
      after_setup: 'echo rails_app /workspaces/rails_app'
    })
  })

  it('generates the correct environment', () => {
    expect(staxfile.compose.services['rails_app-web'].environment).toEqual({
      HELLO: 'world',
      RAILS_ENV: 'test'
    })
  })

  it('generates the correct number of services', () => {
    expect(Object.keys(staxfile.compose.services)).toEqual(['rails_app-web', 'rails_app-sidekiq'])
  })

  it('generates the correct web service', () => {
    const service = staxfile.compose.services['rails_app-web']
    expect(service.command).toEqual('bin/rails server --port 3000 --binding 0.0.0.0')
    expect(service.container_name).toEqual('tests-rails_app-web')
    expect(service.hostname).toEqual('rails_app-web')
    expect(service.expose).toEqual([ 3000 ])
    expect(service.labels['caddy']).toEqual('rails-app.d3v.localhost')
    expect(service.labels['caddy.reverse_proxy']).toEqual('{{ upstreams 3000 }}')
  })

  it('generates the correct sidekiq service', () => {
    const service = staxfile.compose.services['rails_app-sidekiq']
    expect(service.command).toEqual('/usr/local/bin/launch bundle exec sidekiq')
    expect(service.container_name).toEqual('tests-rails_app-sidekiq')
    expect(service.hostname).toEqual('rails_app-sidekiq')
  })

  services.forEach((name) => {
    it(`generates common build attributes for ${name}`, () => {
      const service = staxfile.compose.services[name]
      expect(service.build.context).toEqual(join(fixturesDir, 'build'))
      expect(service.build.dockerfile).toEqual(join(cacheDir, 'build-Dockerfile'))
    })

    it(`generates common labels for ${name}`, () => {
      const labels = staxfile.compose.services[name].labels
      expect(labels['stax.staxfile']).toEqual(path.join(fixturesDir, 'rails_app.staxfile'))
      expect(labels['stax.context']).toEqual('tests')
      expect(labels['stax.app']).toEqual('rails_app')
      expect(labels['stax.source']).toEqual(fixturesDir)
      expect(labels['stax.workspace']).toEqual('/workspaces/rails_app')
      expect(labels['stax.workspace_volume']).toEqual(undefined)
      expect(labels['stax.vars.ruby_version']).toEqual('2.0.1')
      expect(labels['stax.vars.rails_server_port']).toEqual(3000)
      expect(labels['stax.after_setup']).toEqual('echo rails_app /workspaces/rails_app')
      expect(labels['stax.requires']).toEqual('["mysql","caddy"]')
    })

    it(`generates common volumes for ${name}`, () => {
      const volumes = staxfile.compose.services[name].volumes
      expect(volumes[0]).toBe('${HOME}/.ssh/known_hosts:/home/' + process.env.USER + '/.ssh/known_hosts')
      expect(volumes[1]).toEndWith(':/run/host-services')
      expect(volumes[2]).toBe(`${fixturesDir}:/workspaces/rails_app`)
    })
  })
})
