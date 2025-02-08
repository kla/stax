#compdef stax

_stax() {
  local curcontext state
  _arguments -s \\
    '1:command:->command' \\
    '2:app:->app' && return 0
  
  case $state in
    command)
      local -a main_commands
      main_commands=(cat config copy cp down duplicate edit exec run get inspect logs rebuild remove rm restart shell sh up)
      _describe 'stax commands' main_commands
      ;;
    app)
      if [[ $words[2] == sh || $words[2] == shell ]]; then
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
