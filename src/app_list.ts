import Table from 'cli-table3'
import App from './app'
import Location from './location'

const stateIcons = {
  created: '🐣',
  healthy: '🟢',
  unhealthy: '🟡',
  running: '🔵',
  exited: '⚫',
  paused: '⏸️',
  restarting: '⌛',
  dead: '💀',
  unknown: '❔',
}

const sourceIcons = {
  local: '📁',
  remote: '🌐',
}

export default function list(apps: App[]) {
  const table = new Table({
    head: ['', 'App', 'Status', 'Uptime', 'Port(s)', 'Source'],
    style: { head: ['cyan'] },
    chars: {
      'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
      'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
      'left': '', 'left-mid': '', 'mid': '', 'mid-mid': '',
      'right': '', 'right-mid': '', 'middle': ' '
    }
  })

  apps.forEach((app) => {
    app.containers.forEach((container) => {
      table.push([
        stateIcons[container.state] || stateIcons.unknown,
        app.name,
        container.state,
        container.uptime,
        container.attributes.Ports,
        `${sourceIcons[Location.from(container.config.source).type]} ${container.config.source}`,
      ])
    })
  })
  console.log(table.toString().replaceAll('\n *\n', '\n'))
}
