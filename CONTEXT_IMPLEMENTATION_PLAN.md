# Context Implementation Plan

## Current State Analysis

### What's Already Implemented

1. **Context as a concept exists** - `StaxConfig.context` stores the docker compose project name
2. **Hardcoded default** - `DEFAULT_CONTEXT_NAME = 'stax'` in `src/commands/index.ts:26`
3. **Context flows through the system**:
   - `Stax` class stores context and passes it to all operations
   - `docker.compose()` uses `--project-name ${context}` for isolation
   - `docker.ps()` filters containers by `com.docker.compose.project=${context}` label
   - Container naming: `${context}-${app}-${service}`
   - Git cache location: `~/.stax/cache/${context}/.git/`

4. **Labels created automatically** - All `StaxConfig` properties become `stax.*` labels via `makeLabels()` in `src/staxfile/index.ts:147-156`

5. **Override mechanism exists** - `--stax.context=value` can be parsed (via `parseAndRemoveWildcardOptions`) but isn't used for switching context

6. **Settings system exists** - `src/settings.ts` reads/writes to `~/.stax/settings.yaml`

### What's Missing

1. **No persistent context selection** - Context is hardcoded, not read from settings
2. **No `stax context` command** - No way to view/switch contexts
3. **No context awareness in commands** - Commands don't show current context
4. **No context listing** - Can't see what contexts exist

---

## Implementation Plan

### Phase 1: Read Context from Settings

**File: `src/commands/index.ts`**

```typescript
import settings from '~/settings'

const DEFAULT_CONTEXT_NAME = 'stax'

function getContext(): string {
  return settings.read('context', DEFAULT_CONTEXT_NAME)
}

export function registerCommands(program: Command, overrides: StaxConfig, additionalCommands: Function[] = []) {
  // Allow --stax.context override, otherwise use settings, fallback to default
  const contextName = overrides?.context || getContext()
  const stax = new Stax(contextName)
  // ... rest unchanged
}
```

### Phase 2: Create `stax context` Command

**New file: `src/commands/context.ts`**

```typescript
import { Command } from 'commander'
import settings from '~/settings'
import docker from '~/docker'
import icons from '~/icons'
import Stax from '~/stax'

const DEFAULT_CONTEXT_NAME = 'stax'

export default function registerContextCommand(program: Command, stax: Stax) {
  const context = program.command('context')
    .description('Manage stax contexts (project isolation)')

  // Show current context: stax context
  context
    .action(() => {
      const current = settings.read('context', DEFAULT_CONTEXT_NAME)
      console.log(`Current context: ${current}`)
    })

  // Switch context: stax context use <name>
  context.command('use <name>')
    .description('Switch to a different context')
    .action((name) => {
      settings.write('context', name)
      console.log(`${icons.saved} Switched to context '${name}'`)
    })

  // List contexts: stax context ls
  context.command('ls')
    .alias('list')
    .description('List all contexts with containers')
    .action(() => {
      const contexts = listAllContexts()
      const current = settings.read('context', DEFAULT_CONTEXT_NAME)

      contexts.forEach(ctx => {
        const marker = ctx === current ? '* ' : '  '
        console.log(`${marker}${ctx}`)
      })
    })

  // Show context info: stax context info [name]
  context.command('info [name]')
    .description('Show details about a context')
    .action((name) => {
      const contextName = name || settings.read('context', DEFAULT_CONTEXT_NAME)
      const contextStax = new Stax(contextName)
      const apps = contextStax.apps()

      console.log(`Context: ${contextName}`)
      console.log(`Apps: ${apps.length}`)
      apps.forEach(app => {
        console.log(`  - ${app.name} (${app.containers.length} containers)`)
      })
    })
}

function listAllContexts(): string[] {
  // Get all unique contexts from existing containers
  const output = capture('docker ps --all --format "{{.Label \"com.docker.compose.project\"}}"')
  const contexts = [...new Set(output.split('\n').filter(Boolean))]
  return contexts.sort()
}
```

### Phase 3: Register the New Command

**File: `src/commands/index.ts`**

Add import and registration:
```typescript
import registerContextCommand from './context'
// ...
registerContextCommand(program, stax)
```

### Phase 4: Show Context in Output (Optional Enhancement)

**File: `src/stax.ts`** - Add context display helper

**File: `src/app_list.ts`** - Optionally show context in ls output header

### Phase 5: Update Autocomplete

**File: `src/commands/auto_complete.ts`**

Add context command and subcommands to autocomplete.

---

## Detailed File Changes

### 1. `src/commands/index.ts`

```diff
 import settings from '~/settings'
+import registerContextCommand from './context'

 const DEFAULT_CONTEXT_NAME = 'stax'

+function getContext(overrides: StaxConfig): string {
+  return overrides?.context || settings.read('context', DEFAULT_CONTEXT_NAME)
+}
+
 export function registerCommands(program: Command, overrides: StaxConfig, additionalCommands: Function[] = []) {
-  const stax = new Stax(DEFAULT_CONTEXT_NAME)
+  const stax = new Stax(getContext(overrides))

   registerAliasCommand(program, stax)
   // ... existing commands ...
+  registerContextCommand(program, stax)

   if (additionalCommands?.length > 0)
```

### 2. `src/commands/context.ts` (New File)

Full implementation as shown in Phase 2 above.

### 3. `src/settings.ts` (Optional Enhancement)

Add a `CONTEXT_SETTING_NAME` constant for consistency:

```typescript
export const CONTEXT_SETTING_NAME = 'context'
```

---

## Command Interface Design

```
stax context                    # Show current context
stax context use <name>         # Switch to context (creates if needed)
stax context ls                 # List all contexts with containers
stax context info [name]        # Show apps/containers in a context
```

### Examples

```bash
# Check current context
$ stax context
Current context: stax

# Switch to development context
$ stax context use dev
💾 Switched to context 'dev'

# List all contexts
$ stax context ls
* dev
  stax
  production

# See what's in a context
$ stax context info dev
Context: dev
Apps: 2
  - myapp (3 containers)
  - redis (1 container)

# Setup an app in the current context
$ stax setup ./Staxfile
# App is created with context=dev

# Override context for single command
$ stax --stax.context=production ls
```

---

## Migration & Compatibility Notes

1. **Backward compatible** - Default context remains 'stax'
2. **No data migration needed** - Existing containers keep working
3. **Settings file** - New `context` key added to `~/.stax/settings.yaml`
4. **Override precedence**: `--stax.context` flag > settings > default

---

## Testing Plan

1. **Unit tests for context command**:
   - Test `getContext()` returns default when no setting
   - Test `getContext()` returns setting value when set
   - Test override takes precedence over setting

2. **Integration tests**:
   - Create app in one context
   - Switch context
   - Verify app not visible in new context
   - Switch back, verify app visible again

3. **Manual testing**:
   - `stax context` shows "stax" initially
   - `stax context use dev` switches
   - `stax ls` shows only dev context apps
   - `stax context ls` shows all contexts

---

## Implementation Order

1. ✅ Research complete
2. [ ] Create `src/commands/context.ts`
3. [ ] Modify `src/commands/index.ts` to read context from settings
4. [ ] Add export to use `capture` from shell in context.ts
5. [ ] Register command in index.ts
6. [ ] Test manually
7. [ ] Update autocomplete (optional)
8. [ ] Add tests (optional)
