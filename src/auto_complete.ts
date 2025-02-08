import Stax from '~/stax'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const commands = 'cat config copy cp down duplicate edit exec run get inspect logs rebuild remove rm restart shell sh up'.split(' ')

function generate(stax: Stax) {
  const appNames = stax.apps().map(app => app.name)
  console.log(appNames)
  const opts = commands.join(' ')
  return `
_stax_complete() {
local cur prev opts
COMPREPLY=()
cur="\${COMP_WORDS[COMP_CWORD]}"
prev="\${COMP_WORDS[COMP_CWORD-1]}"
opts="${opts}"

case "\${prev}" in
${commands.join('|')})
  COMPREPLY=( $(compgen -W "$(echo ${appNames.join(' ')})" -- "\${cur}") )
  return 0
  ;;
esac

COMPREPLY=( $(compgen -W "\${opts}" -- "\${cur}") )
}
complete -F _stax_complete stax
  `
}

export default function installAutoComplete(stax: Stax) {
  const completionDir = path.join(os.homedir(), '.local', 'share', 'bash-completion', 'completions')
  const completionFile = path.join(completionDir, 'stax')

  if (!fs.existsSync(completionDir)) fs.mkdirSync(completionDir, { recursive: true })
  fs.writeFileSync(completionFile, generate(stax))

  return completionFile
}
