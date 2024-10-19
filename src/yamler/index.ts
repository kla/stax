import YamlER from './yamler'

const dumpOptions = { lineWidth: -1, noRefs: true }
const sanitizeRegex = /[^a-zA-Z0-9_]/g
const importRegex = /^ *!import\s+(.+)\sas\s+(.+)$/gm
const extendsRegex = /^(\s*)(.+):\s*!extends\s+(.+)$/gm
const rootExtendsRegex = /^ *!extends\s+(.+)$/gm
const anchorNamePrefix = '_stax_import_'

export { dumpOptions, sanitizeRegex, importRegex, extendsRegex, rootExtendsRegex, anchorNamePrefix }
export default YamlER
