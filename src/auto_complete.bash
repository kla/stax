_stax_complete() {
  local cur prev opts commands
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"
  commands="alias cat list ls ps copy cp down duplicate edit exec run get inspect logs rebuild remove restart settings setup shell sh up logo auto_complete help"

  case "${prev}" in
    stax)
      COMPREPLY=( $(compgen -W "${commands}" -- "${cur}") )
      return 0
      ;;
    alias|cat|config|copy|cp|down|duplicate|edit|exec|run|get|inspect|logs|rebuild|remove|rm|restart|shell|sh|up)
      opts="$(stax ls --list-names)"
      COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
      return 0
      ;;
  esac

  COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
}

complete -F _stax_complete stax
