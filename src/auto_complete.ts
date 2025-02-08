import Stax from '~/stax'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const commands = 'cat config copy cp down duplicate edit exec run get inspect logs rebuild remove rm restart shell sh up'.split(' ')

function generate(stax: Stax, shell: string) {
  // Prepare literal arrays for insertion into the completion script
  const commandsList = commands.map(command => `"${command}"`).join(' ')
  
  if (shell === 'zsh') {
    return `
#compdef stax

_stax() {
  local curcontext state
  _arguments -s \\
    '1:command:->command' \\
    '2:app:->app' && return 0
  
  case $state in
    command)
      local -a main_commands
      main_commands=(${commandsList})
      _describe 'stax commands' main_commands
      ;;
    app)
      if [[ $words[1] == sh || $words[1] == shell ]]; then
         _files
      else
         local -a apps
         # Dynamically get the list of apps using the stax list-apps command
         apps=($(stax ls --list-names))
         _describe 'apps' apps
      fi
      ;;
  esac
}

if ! command -v compinit >/dev/null; then
  autoload -U compinit && compinit
fi

compdef _stax stax
`
  } else {
    return `
_stax_complete() {
  local cur prev opts
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  opts="\$(stax ls --list-names)"
  local app_names="\$(stax ls --list-names)"

  case "\${prev}" in
    ${commands.join('|')})
      COMPREPLY=( $(compgen -W "\${app_names}" -- "\${cur}") )
      return 0
      ;;
  esac

  COMPREPLY=( $(compgen -W "\${opts}" -- "\${cur}") )
}
complete -F _stax_complete stax
`
  }
}

function getCompletionDir(shell: string): string {
  if (shell === 'zsh') return path.join(process.env.STAX_HOME)
  return path.join(os.homedir(), '.local', 'share', 'bash-completion', 'completions')
}

function getCompletionFile(completionDir: string, shell: string): string {
  if (shell === 'zsh') return path.join(completionDir, '_stax')
  return path.join(completionDir, 'stax')
}

export default function installAutoComplete(stax: Stax) {
  const shell = process.env.SHELL?.includes('zsh')
    ? 'zsh'
    : process.env.SHELL?.includes('bash')
      ? 'bash'
      : null

  if (!shell) return null

  const completionDir = getCompletionDir(shell)
  const completionFile = getCompletionFile(completionDir, shell)

  if (!fs.existsSync(completionDir)) fs.mkdirSync(completionDir, { recursive: true })
  fs.writeFileSync(completionFile, generate(stax, shell))

  if (shell === 'zsh') {
    const zshrcPath = path.join(os.homedir(), '.zshrc')
    const sourceCommand = `source ${completionFile}`
    const completionComment = '# stax completions'
    const contentToAdd = `\n${completionComment}\n${sourceCommand}`

    if (!fs.readFileSync(zshrcPath).includes(sourceCommand)) {
      fs.writeFileSync(zshrcPath, contentToAdd, { flag: 'a' })
    }
  }

  console.log(`Restart your shell or run 'source ~/.${shell}rc' to enable auto completions.`)
  return completionFile
}
