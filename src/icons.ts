import chalk from 'chalk'

const icons = {
  created: '🐣',
  healthy: '🟢',
  unhealthy: '🟡',
  running: '🔵',
  exited: '⚫',
  warning: '⚠️',
  paused: '⏸️',
  restarting: '⌛',
  dead: '💀',
  unknown: '❔',
  local: '📁',
  remote: '🌐',
  error: '😡',
  trash: '🗑️',
  play: '▶️',
  success: '✅',
  build: '🛠️',
  failed: '❌',
  launch: '🚀',
  info: '💡',
  saved: '💾',
}

const miniStateIcons = {
  healthy: chalk.green('•'),
  running: chalk.blue('•'),
  exited: chalk.black('•'),
  unhealthy: chalk.yellow('•'),
  unknown: chalk.black('•'),
}

export default icons
export { miniStateIcons }
