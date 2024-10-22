import YamlER from './yamler'
import { anchorNamePrefix, sanitizeRegex } from './index'

export default class Import {
  public match: string
  public name: string
  public filePath: string
  public yamler: YamlER

  constructor({ match, name, filePath, parentFile }: { match: string, name: string, filePath: string, parentFile: string }) {
    this.match = match
    this.name = name
    this.filePath = filePath
    this.yamler = new YamlER(filePath, { parentFile })
  }

  get anchorName(): string {
    return this.buildAnchorName([ this.filePath, this.yamler.parentFile, this.name ])
  }

  buildAnchorName(parts: string | string[]): string {
    if (typeof parts === 'string') parts = [ parts ]
    return [ anchorNamePrefix, ...parts.map(part => part.replace(sanitizeRegex, '_')) ].join('_')
  }
}

