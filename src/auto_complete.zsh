#compdef stax

_stax_complete() {
  local cur prev completions
  cur="${words[CURRENT]}"
  prev="${words[CURRENT-1]}"
  case "${prev}" in
    stax)
      completions=(alias cat list ls ps copy cp down duplicate edit exec run get inspect logs rebuild remove restart settings setup shell sh up logo auto_complete help)
      ;;
    alias|cat|config|copy|cp|down|duplicate|edit|exec|run|get|inspect|logs|rebuild|remove|rm|restart|shell|sh|up)
      completions=($(stax ls --list-names))
      ;;
  esac
  compadd -- ${(M)completions:#$cur*}
}

if ! command -v compinit >/dev/null; then
  autoload -U compinit && compinit
fi

compdef _stax_complete stax
