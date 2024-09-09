import Table from 'cli-table3'
import App from './app'
import Container from './container'
import Location from './location'
import icons from './icons'

function name(app: App, container: Container) {
  if (app.containers.length > 1) {
    const tree = app.containers.length == container.number + 1 ? '└─' : '├─'
    return `${tree} ${container.service.replace(`${app.name}-`, '')}`
  }
  return app.name
}

export default function list(apps: App[]) {
  const table = new Table({
    head: ['', 'App', 'Status', 'Uptime', 'Port(s)', 'Source'],
    style: { head: ['cyan'] },
    chars: {
      'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
      'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
      'left': '', 'left-mid': '', 'mid': '', 'mid-mid': '',
      'right': '', 'right-mid': '', 'middle': '' // Changed from ' ' to ''
    }
  })

  apps.forEach((app) => {
    const source = `${icons[Location.from(app.primary.config.source).type]} ${app.primary.config.source}`

    if (app.containers.length > 1)
      table.push([ icons[app.state], app.name, '', '', '', source ])

    app.containers.forEach((container) => {
      table.push([
        icons[container.state] || icons.unknown,
        name(app, container),
        container.state,
        container.uptime,
        container.attributes.Ports,
        app.containers.length == 1 ? source : '',
      ])
    })
  })
  console.log(table.toString().replaceAll('\n *\n', '\n'))
}
