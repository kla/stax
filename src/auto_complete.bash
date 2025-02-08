_stax_complete() {
  local cur prev opts
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"
  opts="$(stax ls --list-names)"

  case "${prev}" in
    cat|config|copy|cp|down|duplicate|edit|exec|run|get|inspect|logs|rebuild|remove|rm|restart|shell|sh|up)
      COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
      return 0
      ;;
  esac

  COMPREPLY=( $(compgen -W "${opts}" -- "${cur}") )
}

complete -F _stax_complete stax
