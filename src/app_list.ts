import Table from 'cli-table3'

const icons = {
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

export default function list(apps: App[]) {
  const table = new Table({
    head: ['', 'App', 'Status', 'Uptime', 'Port(s)'],
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
        icons[container.state] || icons.unknown,
        app.name,
        container.state,
        container.uptime,
        container.attributes.Ports,
      ])
    })
  })
  console.log(table.toString().replaceAll('\n *\n', '\n'))
}
