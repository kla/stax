import yaml from 'js-yaml'
import { writeFileSync } from 'fs'
import { deepRemoveKeys } from "~/utils"

interface CompileOptions {
  outputFile?: string
}

export default class Compose {
  public config: any

  constructor(config: any) {
    this.config = structuredClone(config)
  }

  compile(options: CompileOptions): string {
    const config = yaml.dump(deepRemoveKeys(this.config, [ 'defaults', 'modules' ]))

    if (options?.outputFile)
      writeFileSync(options.outputFile, config, 'utf-8')

    return config
  }
}
