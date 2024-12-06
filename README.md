# clipanion-generator-command

An extendable, abstract [clipanion](https://mael.dev/clipanion/) command for generating files.

## Example

```typescript
import { Generator, GeneratorCommand } from 'clipanion-generator-command'

class MyGenerator extends Generator {
  override renderTempate(templateContext: any, templateContents: string) {
    // Your template rendering behaviour goes here.
  }
}

abstract class MyGeneratorCommand extends GeneratorCommand {
  override get generator() {
    return new MyGenerator(this.templateDir, this.destinationDir)
  }
}
```

Now you're ready to write your CLI Commands. All CLI arguments will be passed as `templateContext` to the `renderTemplate` methods.

```typescript
import { Option } from 'clipanion'

class NewThingCommand extends MyGeneratorCommand {
  override get templateDir() {
    return './templates'
  }

  override get destinationDir() {
    return `./packages/${this.name}`
  }

  name = Option.String('--name,-n', {
    description: 'The name of your new thing',
    required: true,
  })
}
```
