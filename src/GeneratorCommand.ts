import { BaseContext, Command, Option } from 'clipanion'
import { type Generator } from './Generator.js'
import Enquirer from 'enquirer'
import { FileExistsError } from './FileExistsError.js'
import { rm } from 'node:fs/promises'

export abstract class GeneratorCommand<
  Context extends BaseContext = BaseContext,
> extends Command<Context> {
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

  protected async generateAll() {
    for await (const result of this.#generateAll()) {
      if (result instanceof FileExistsError) {
        if (await this.#confirmOverwrite(result.destinationPath))
          await this.#overwrite(result.templateName, result.fileName)
      } else {
        this.context.stdout.write(`📁 ${result[1]}\n`)
      }
    }
  }

  /**
   * Remove a destination file with a pre-warning and confirmation
   *
   * @example
   * Say you are about to create a docker-compose.yml file, but want to
   * make sure that docker-compose.yaml isn't in the project.
   * ```
   * await this.removeDestinationFile('docker-compose.yaml', 'docker-compose.yml.mustache')
   * ```
   */
  protected async removeDestinationFile(
    fileName: string,
    templateName: string,
  ) {
    try {
      await this.generator.assertDestinationInexistence(fileName, templateName)
    } catch (error) {
      if (error instanceof FileExistsError) {
        if (await this.#confirmOverwrite(error.destinationPath))
          await rm(error.destinationPath)
      } else throw error
    }
  }

  #generateAll() {
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
    await this.generateAll()
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
