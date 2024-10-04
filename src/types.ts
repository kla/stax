export interface BuildOptions {
  dockerfile: string;
  args: Record<string, string>;
  modules: string[];
}

export interface FindOptions {
  warn?: boolean
  mustExist?: boolean
}

export interface FindContainerOptions {
  service?: string
}

/**
 * Represents the options for running a command.
 */
export interface RunOptions {
  env?: Record<string, string>,

  // The current working directory for the command.
  cwd?: string

  // The command to be executed.
  cmd?: string

  // Specifies whether the command should be executed quietly.
  quiet?: boolean

  // The standard input/output streams for the command.
  stdio?: 'inherit' | 'pipe' | 'ignore' | 'ipc' | (number | null | undefined)
}

export interface StaxConfig {
  /** The docker compose project name (default is 'stax') */
  context: string

  /** Location of the application's source. Either a local directory or a git repo url. When it
   * is a local directory it will be mounted from the host. When it is a git repo the repo will
   * be cloned into the volume specified by 'workspace_volume'.
   */
  source: string

  /** Local path to the Staxfile used to setup the app */
  staxfile: string

  /** Name of the application */
  app: string

  /** Directory in the container that the app's source should be mounted to. */
  workspace: string

  /** Name of volume to create for the app's source in the container */
  workspace_volume: string

  /** User defined variables */
  vars: Record<string, string>

  /**
   * A list of app names that this app requires.
   */
  requires: string[]
}

export interface SetupOptions {
  inspect?: boolean
  rebuild?: boolean
  duplicate?: boolean
}
