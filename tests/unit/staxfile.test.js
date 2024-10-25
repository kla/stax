import { describe, it, expect, beforeEach } from 'bun:test'
import { mkdirSync,rmSync } from 'fs'
import { resolve } from '~/utils'
import Staxfile from '~/staxfile'
import path from 'path'

describe('Staxfile', () => {
  // let staxfile
  // const cacheDir = path.join(__dirname, '../../tmp/tests-staxfile-cache')

  // beforeEach(() => {
  //   rmSync(cacheDir, { recursive: true, force: true })
  //   mkdirSync(cacheDir, { recursive: true })
  //   staxfile = new Staxfile({ app: 'some_service', context: 'tests', source: './tests/fixtures', staxfile: './tests/fixtures/some_service.staxfile' }, { cacheDir })
  // })

  // it('compiles', async () => {
  //   await staxfile.compile({ force: true })
  //   // console.log(staxfile.config)
  //   expect(staxfile.config.app).toBe('some_service')
  //   expect(staxfile.config.staxfile).toBe(resolve('./tests/fixtures/some_service.staxfile'))
  //   expect(staxfile.config.source).toBe(resolve('./tests/fixtures'))
  //   expect(staxfile.config.workspace).toBe('/workspaces/some_service')
  //   expect(staxfile.config.workspace_volume).toBe('some_service-workspace')
  //   expect(staxfile.config.vars.rails_server_port).toBe(3000)
  //   expect(staxfile.config.vars.ubuntu_version).toBe(24.04)
  //   expect(staxfile.config.vars.ruby_version).toBe('2.0.1')
  // })
})
