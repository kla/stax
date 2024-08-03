import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { vi } from 'vitest'
import docker from '~/docker'
import Hooks from '~/hooks'
import Container from '~/container'

describe('Container', () => {
  let psSpy, composeSpy

  beforeEach(() => {
    psSpy = vi.spyOn(docker, 'ps')
    composeSpy = vi.spyOn(docker, 'compose')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('creates a Container instance with the provided attributes', () => {
      const attributes = {
        Names: 'test-container',
        Labels: 'com.docker.compose.project=test-project',
      }
      const container = new Container(attributes)
      expect(container.attributes).toBe(attributes)
      expect(container.hooks).toBeInstanceOf(Hooks)
    })
  })

  describe('name', () => {
    it('returns the container name', () => {
      const attributes = { Names: 'test-container' }
      const container = new Container(attributes)
      expect(container.name).toBe('test-container')
    })
  })

  // Add more test cases for other properties and methods

  describe('all', () => {
    it('returns an array of Container instances', () => {
      const attributes = [
        { Names: 'container1', Labels: 'com.docker.compose.project=test-project' },
        { Names: 'container2', Labels: 'com.docker.compose.project=test-project' },
      ]
      psSpy.mockReturnValueOnce(attributes)

      const containers = Container.all('test-project')
      expect(containers).toHaveLength(2)
      expect(containers[0]).toBeInstanceOf(Container)
      expect(containers[1]).toBeInstanceOf(Container)
    })
  })

  describe('find', () => {
    it('returns the Container instance with the specified name', () => {
      const attributes = [
        { Names: 'container1', Labels: 'com.docker.compose.project=test-project' },
        { Names: 'container2', Labels: 'com.docker.compose.project=test-project' },
      ]
      psSpy.mockReturnValueOnce(attributes)

      const container = Container.find('test-project', 'container1')
      expect(container).toBeInstanceOf(Container)
      expect(container?.name).toBe('container1')
    })

    it('returns undefined if the container is not found', () => {
      psSpy.mockReturnValueOnce([])

      const container = Container.find('test-project', 'container1')
      expect(container).toBeUndefined()
    })
  })
})
