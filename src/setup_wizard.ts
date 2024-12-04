import { StaxConfig } from './types'
import { exit, presence } from './utils'
import Staxfile from './staxfile'
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
  return staxfiles.sort()
}

function findStaxfiles(context: string): any {
  const servicesHome = settings.read('services_home') || exit(1, { message: `${icons.error} services_home is not set in settings` })
  const all = presence(search(servicesHome)) || exit(1, { message: `${icons.error} No Staxfiles found in ${servicesHome}` })
  const installed = App.allContainers(context).map(container => container.staxfile)
  const uninstalled = presence(all.filter(file => !installed.includes(file))) || exit(0, { message: `${icons.success} All services in ${servicesHome} are already installed`})

  return { installed, uninstalled }
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

async function installDependencies(missing, stax) {
  const names = Object.keys(missing)
  const { installMissing } = await inquirer.prompt([{
    type: 'confirm',
    name: 'installMissing',
    message: `The following dependencies are not installed yet: ${names.join(', ')}. Would you like to install them?`,
    default: true
  }])

  if (installMissing) {
    for (const [name, file] of Object.entries(missing)) {
      console.log(`\n${icons.launch} Installing ${name}...`)
      await stax.setup({ source: file })
    }

    console.log(`${icons.success} All missing dependencies have been installed.\n`)
  } else {
    console.log(`${icons.warning} Skipping installation of missing dependencies.\n`)
  }
}

export default async function setupWizard(stax: stax) {
  let { installed, uninstalled } = findStaxfiles(stax.context)
  const file = await pickStaxfile(uninstalled)
  const staxfile = new Staxfile({ context: stax.context, source: file } as unknown as StaxConfig)

  await staxfile.compile({ force: true })
  installed = Object.fromEntries(installed.map(file => [getStaxfileName(file), file]))
  uninstalled = Object.fromEntries(uninstalled.map(file => [getStaxfileName(file), file]))
  const missing = staxfile.config.requires.filter(name => !(name in installed))

  if (missing.length > 0) {
    const missingStaxfiles = Object.fromEntries(missing.map(name => [name, uninstalled[name]]).filter(([_, value]) => value !== undefined))
    await installDependencies(missingStaxfiles, stax)
  }

  console.log(`${icons.launch} Installing ${staxfile.config.app}...`)
  const app = await stax.setup({ source: staxfile.config.staxfile } as unknown as StaxConfig)
  console.log('\n' + app.installedMessage())
}
