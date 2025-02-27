import Xaml, { loadFile, dump } from './xaml'

export const dumpOptions = { lineWidth: -1, noRefs: true }
export const sanitizeRegex = /[^a-zA-Z0-9_]/g
export const importRegex = /^ *!import\s+(.+)\sas\s+(.+)$/gm
export const extendsRegex = /^(\s*)(.+):\s*!extends\s+(.+?)$/gm
export const extendsArrayRegex = new RegExp(String.raw`^(\s*)(\S+):\s*!extends_array\s+(\S+)((\n\1\s*-.*)+)?`, 'gm')
export const rootExtendsRegex = /^ *!extends\s+(.+?)$/gm
export const anchorNamePrefix = '_xaml_import_'

export class ExpressionWarning extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExpressionWarning'
    // This is needed in TypeScript to maintain proper prototype chain
    Object.setPrototypeOf(this, ExpressionWarning.prototype)
  }
}

export interface EvaluationContext {
  baseDir: string
  attributes: Record<string, any>
  path: string
  symbol: Record<string, any>
  name: string
  args: string[]
}

export { loadFile, dump }
export default Xaml
