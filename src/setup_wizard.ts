import { StaxConfig } from './types'
import { exit, presence } from './utils'
import * as fs from 'fs'
import * as path from 'path'
import settings from './settings'
import stax from './stax'
import icons from './icons'
import inquirer from 'inquirer'
import App from './app'

function search(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const staxfiles: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      staxfiles.push(...search(fullPath))
    } else if (entry.name === 'Staxfile' || entry.name.endsWith('.staxfile')) {
      staxfiles.push(fullPath)
    }
  }
  return staxfiles
}

function findStaxfiles(context: string): string[] {
  const servicesHome = settings.read('services_home') || exit(1, { message: `${icons.error} services_home is not set in settings` })
  const allStaxfiles = presence(search(servicesHome)) || exit(1, { message: `${icons.error} No Staxfiles found in ${servicesHome}` })
  const installedStaxfiles = App.allContainers(context).map(container => container.staxfile)

  return presence(allStaxfiles.filter(file => !installedStaxfiles.includes(file))) || exit(1, { message: `${icons.error} All services in ${servicesHome} are already installed`})
}

function getStaxfileName(filePath: string): string {
  const fileName = path.basename(filePath)
  const dirName = path.basename(path.dirname(filePath))

  return fileName === 'Staxfile' ? dirName : fileName.replace('.staxfile', '')
}

async function pickStaxfile(staxfiles: string[]) {
  const { selected } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message: 'Select service to install:',
      choices: staxfiles.map(file => ({ name: getStaxfileName(file), value: file })),
      loop: false
    }
  ])
  return selected
}

export default async function setupWizard(stax: stax) {
  const staxfile: string = await pickStaxfile(findStaxfiles(stax.context))
  console.log(`Selected service to install: ${staxfile}`)
  await stax.setup({ source: staxfile } as unknown as StaxConfig)
}
