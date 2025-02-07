WIP

<img src="https://raw.githubusercontent.com/kla/stax/refs/heads/main/stax-ansi.png" height="150" align="right" />

Stax is a CLI tool for creating and managing containers. Primarily for development purposes but can also be used for self hosting containers.

## Configuration

Stax uses a `Staxfile` to define your containers. It's basically a docker compose file with some extra features like importing from other yaml files.

Example:
```yaml
!import ../imports/rails.yaml as rails

!extends rails

stax: !extends rails.stax
  source: git@github.com:me/my-rails-app.git
  requires:
    - caddy
    - mysql
  after_setup: ./bin/setup
```

### Example Commands

*   `stax setup`: Install an application.
*   `stax ls`: Lists all applications
*   `stax sh <name>`: Opens a shell into the primary container of an application
*   `stax edit <name>`: Opens an application in VS Code based editor
*   `stax down <name>`: Stops an application
*   `stax remove <name>`: Removes an application
*   `stax help`: Shows help