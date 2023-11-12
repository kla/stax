import { writeFileSync, mkdirSync } from 'fs'
import { csvKeyValuePairs } from './utils.js'
import * as yaml from 'js-yaml'

export function generateComposeFile(config) {
  const compose = { services: {} }

  compose.services[config.name] = {
    image: config.image,
    container_name: config.name,
    command: 'sleep infinity',
    volumes: [ config.workspaceMount.includes(',') ? csvKeyValuePairs(config.workspaceMount) : config.workspaceMount ],
  }

  mkdirSync(config.local.workingDirectory, { recursive: true })
  writeFileSync(`${config.local.workingDirectory}/docker-compose.yaml`, yaml.dump(compose))
}
