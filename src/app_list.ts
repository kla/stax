import Table from 'cli-table3'
import App from './app'
import Container from './container'
import Location from './location'
import icons, { miniStateIcons } from './icons'

function name(app: App, container: Container, options: { fields?: string[], full?: boolean, app?: string }) {
  if (app.containers.length > 1 && options.full) {
    const tree = app.containers.length == container.number + 1 ? '└─' : '├─'
    return `${tree} ${container.service.replace(`${app.name}-`, '')}`
  }
  return `${app.name}${childStatuses(app)}`
}

function childStatuses(app: App) {
  return app.containers.length > 1 ? ` ${app.containers.map(c => miniStateIcons[c.state] || miniStateIcons.unknown).join('')}` : ''
}

function row(app: App, options: { fields?: string[], full?: boolean }) {
  const items = []
  const source = `${icons[Location.from(app.context, app.name, app.primary.config.source).local ? 'local' : 'remote']} ${app.primary.config.source}`
  const slice = app.containers.length > 1 && options.full ? app.containers.length : 1

  if (app.containers.length > 1 && options.full)
    items.push([ icons[app.state], app.name, '', '', '', source ])

  app.containers.slice(0, slice).forEach((container, index) => {
    items.push([
      icons[container.state] || icons.unknown,
      name(app, container, options),
      container.uptime?.replace(' ago', ''),
      container.forwardedPorts.join(', '),
      container.ipAddresses.join(', '),
      app.containers.length == 1 || !options.full ? source : '',
    ])
  })
  return items
}

export default function list(apps: App[], options: { fields?: string[], full?: boolean, app?: string } = {}) {
  if (options.app) {
    apps = apps.filter(app => options.app && app.name.startsWith(options.app))
    options = { ...options, full: true }
  }

  const head = ['', 'App', 'Uptime', 'Forwarding', 'IP', 'Source'].concat(options.fields || [])
  const table = new Table({
    head: head,
    style: { head: ['cyan'] },
    chars: {
      'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
      'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
      'left': '', 'left-mid': '', 'mid': '', 'mid-mid': '',
      'right': '', 'right-mid': '', 'middle': '' // Changed from ' ' to ''
    }
  })

  apps.forEach((app) => row(app, options).forEach(item => table.push(item)))
  console.log(table.toString().replaceAll('\n *\n', '\n'))
}
