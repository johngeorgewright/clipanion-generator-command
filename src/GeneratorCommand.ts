import { Command, Option } from 'clipanion'
import { type Generator } from './Generator.js'
import Enquirer from 'enquirer'
import { FileExistsError } from './FileExistsError.js'

export abstract class GeneratorCommand extends Command {
  accessor templateDir = Option.String('--templateDir,-t', {
    description: 'The directory where all your templates live',
    required: true,
  })

  accessor destinationDir = Option.String('--destinationDir,-o', {
    description: 'The directory where to generate files.',
    required: true,
  })

  abstract generator: Generator

  protected templateNameFilter: string[] | ((templateName: string) => boolean) =
    (_templateName: string) => true

  protected generateAll() {
    return this.generator.generateAll(this, this.templateNameFilter)
  }

  protected async generate(
    templateName: string,
    opts: { fileName?: string; force?: boolean },
  ) {
    const [destinationPath] = await this.generator.generate(
      this,
      templateName,
      opts,
    )
    this.context.stdout.write(`📁 ${destinationPath}\n`)
  }

  override async execute() {
    for await (const result of this.generateAll()) {
      if (result instanceof FileExistsError) {
        if (await this.#confirmOverwrite(result.destinationPath))
          await this.#overwrite(result.templateName, result.fileName)
      } else {
        this.context.stdout.write(`📁 ${result[1]}\n`)
      }
    }
  }

  async #confirmOverwrite(destinationPath: string) {
    const { overwrite } = await Enquirer.prompt<{ overwrite: boolean }>({
      name: 'overwrite',
      type: 'confirm',
      message: `${destinationPath} already exists. Overwrite it?`,
    })
    return overwrite
  }

  async #overwrite(templateName: string, fileName: string) {
    await this.generate(templateName, {
      fileName: fileName,
      force: true,
    })
  }
}
