export class FileExistsError extends Error {
  constructor(
    /**
     * The name of the file found in the template directory.
     *
     * @example
     * If your template directory is `_templates` and inside
     * is a file called `package.json`, then the `templateName`
     * is simply `package.json`.
     */
    public readonly templateName: string,

    /**
     * The file name to use when generating inside the
     * {@link Generator.prototype.destinationDir}.
     *
     * @remarks
     * Unless otherwise specified, or a `templateExtension` has to be
     * removed, this is often the same as the `templateName`.
     */
    public readonly fileName: string,

    /**
     * The full path of the file to write to.
     */
    public readonly destinationPath: string,
  ) {
    super(`The file "${destinationPath} already exists`)
  }
}
