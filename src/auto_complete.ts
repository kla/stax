import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const commands = 'cat config copy cp down duplicate edit exec run get inspect logs rebuild remove rm restart shell sh up'.split(' ')

function generate(shell: string) {
  // Prepare literal arrays for insertion into the completion script
  const commandsList = commands.map(command => `"${command}"`).join(' ')
  return fs.readFileSync(path.join(__dirname, `auto_complete.${shell}`))
}

function getCompletionDir(shell: string): string {
  if (shell === 'zsh') return path.join(process.env.STAX_HOME)
  return path.join(os.homedir(), '.local', 'share', 'bash-completion', 'completions')
}

function getCompletionFile(completionDir: string, shell: string): string {
  if (shell === 'zsh') return path.join(completionDir, '_stax')
  return path.join(completionDir, 'stax')
}

export default function installAutoComplete() {
  const shell = process.env.SHELL?.includes('zsh')
    ? 'zsh'
    : process.env.SHELL?.includes('bash')
      ? 'bash'
      : null

  if (!shell) return null

  const completionDir = getCompletionDir(shell)
  const completionFile = getCompletionFile(completionDir, shell)

  if (!fs.existsSync(completionDir)) fs.mkdirSync(completionDir, { recursive: true })
  fs.writeFileSync(completionFile, generate(shell))

  if (shell === 'zsh') {
    const zshrcPath = path.join(os.homedir(), '.zshrc')
    const sourceCommand = `[ -s "${completionFile}" ] && source "${completionFile}"`
    const completionComment = '# stax completions'
    const contentToAdd = `\n${completionComment}\n${sourceCommand}`

    if (!fs.readFileSync(zshrcPath).includes(sourceCommand)) {
      fs.writeFileSync(zshrcPath, contentToAdd, { flag: 'a' })
    }
  }

  console.log(`Restart your shell or run 'source ~/.${shell}rc' to enable auto completions.`)
  return completionFile
}
