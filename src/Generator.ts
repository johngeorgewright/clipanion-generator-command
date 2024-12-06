import { type Dirent } from 'node:fs'
import {
  access,
  constants,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from 'node:fs/promises'
import * as pathHelper from 'node:path'
import { FileExistsError } from './FileExistsError.js'

export abstract class Generator {
  /**
   * @param templateDir The directory where all your templates live.
   * @param destinationDir The directory to generate files in to.
   * @param templateExtensions An array of file extensions to remove from template names before creating files in the destination directory. EG: `['.mustache', '.mu']`.
   */
  constructor(
    public templateDir: string,
    public destinationDir: string,
    public templateExtensions: string[] = [],
  ) {}

  /**
   * Runs {@link generate} on all files found in `templateDir` and yields
   * each result. It will also yield a {@link FileExistsError} if thrown.
   */
  async *generateAll(
    templateContext: any,
  ): AsyncGenerator<
    [templateFileName: string, destinationPath: string] | FileExistsError
  > {
    for await (const templateName of this.getTemplateNames()) {
      try {
        yield await this.generate(templateContext, templateName)
      } catch (error: unknown) {
        if (error instanceof FileExistsError) yield error
        else throw error
      }
    }
  }

  /**
   * Generate the `templateName` template, within {@link templateDir}, into
   * {@link destinationDir}, passing `templateContext` to the template
   * renderer ({@link renderTemplate}).
   *
   * By default the destination file name is the same as the `templateName`
   * with {@link templateExtensions} removed. Provide a `fileName` if you want
   * to bypass that feature.
   *
   * Will throw an error if the file already exists, unless `force` is `true`.
   */
  async generate(
    templateContext: any,
    templateName: string,
    {
      fileName = this.removeTemplateExtension(templateName),
      force = false,
    }: {
      fileName?: string
      force?: boolean
    } = {},
  ): Promise<[templateFileName: string, destinationPath: string]> {
    if (!force) await this.assertDestinationInexistence(fileName, templateName)

    const templateFileName = this.getTemplatePath(templateName)
    const template = (await readFile(templateFileName)).toString()
    const destinationPath = this.getDestinationPath(fileName)
    const destDir = pathHelper.dirname(destinationPath)

    await mkdir(destDir, { recursive: true })
    await writeFile(
      destinationPath,
      this.renderTemplate(templateContext, template),
    )

    return [templateFileName, destinationPath]
  }

  /**
   * The full destination path of `fileName`.
   */
  getDestinationPath(fileName: string) {
    return pathHelper.join(this.destinationDir, fileName)
  }

  /**
   * The full template path of `templateName`.
   */
  getTemplatePath(templateName: string) {
    return pathHelper.join(this.templateDir, templateName)
  }

  /**
   * Assert that `fileName` doesn't exist in {@link destinationDir}.
   *
   * @param templateName Sometimes the source/template name can differ from the destination name. In such cases it's important to pass here in case we need to throw an error with said information.
   */
  async assertDestinationInexistence(fileName: string, templateName: string) {
    const destinationPath = this.getDestinationPath(fileName)
    await access(destinationPath, constants.F_OK).then(
      () => {
        throw new FileExistsError(templateName, fileName, destinationPath)
      },
      () => {},
    )
  }

  /**
   * Remove the 1st of {@link templateExtensions} that matches the end
   * of `fileName`.
   */
  removeTemplateExtension(fileName: string) {
    return fileName.replace(
      this.templateExtensions.find((extension) =>
        fileName.endsWith(extension),
      ) ?? '',
      '',
    )
  }

  /**
   * Yield all template names found in {@link templateDir}.
   */
  async *getTemplateNames() {
    for (const directoryEntry of await readdir(this.templateDir, {
      recursive: true,
      withFileTypes: true,
    })) {
      if (directoryEntry.isDirectory()) continue
      yield this.#getTemplateNameFromDirectoryEntry(directoryEntry)
    }
  }

  /**
   * Render a template with the given `templateContext`.
   *
   * @param templateContext Any kind of contextual information required when rendering templates.
   * @param template The contents of a template file.
   */
  abstract renderTemplate(templateContext: any, template: string): string

  #getTemplateNameFromDirectoryEntry(directoryEntry: Dirent) {
    return pathHelper.join(
      directoryEntry.path.replace(this.templateDir, ''),
      directoryEntry.name,
    )
  }
}
