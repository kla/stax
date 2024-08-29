export interface BuildOptions {
  dockerfile: string;
  args: Record<string, string>;
  modules: string[];
}

export interface FindOptions {
  warn?: boolean
  mustExist?: boolean
}

/**
 * Represents the options for running a command.
 */
export interface RunOptions {
  // The current working directory for the command.
  cwd?: string

  // The command to be executed.
  cmd?: string

  // Specifies whether the command should be executed silently.
  silent?: boolean

  // The standard input/output streams for the command.
  stdio?: 'inherit' | 'pipe' | 'ignore' | 'ipc' | (number | null | undefined)
}

export interface StaxfileOptions {
  context: string
  source: string
  staxfile?: string
  app?: string
  [key: string]: any
}
