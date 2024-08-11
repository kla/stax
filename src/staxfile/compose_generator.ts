import yaml from 'js-yaml'
import { writeFileSync } from 'fs'
import { deepRemoveKeys } from "~/utils"

export default class ComposeGenerator {
  public config: any

  constructor(config: any, dockerfile: string | undefined = undefined) {
    this.config = structuredClone(config)

    if (dockerfile)
      this.config.defaults.build.dockerfile = dockerfile
  }

  compile(outputFile: string | undefined): string {
    const config = yaml.dump(deepRemoveKeys(this.config, [ 'defaults', 'modules' ]))

    if (outputFile) {
      writeFileSync(outputFile, config, 'utf-8')
      return outputFile
    }
    return config
  }
}
