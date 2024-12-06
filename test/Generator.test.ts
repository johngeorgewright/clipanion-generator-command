import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Generator } from '../src/Generator.js'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { FileExistsError } from '../src/FileExistsError.js'

class TestGenerator extends Generator {
  override renderTemplate = vi.fn((_, x) => x)
}

const templateDir = path.join(__dirname, 'fixtures', 'templates')
const destinationDir = path.join(__dirname, 'fixtures', 'output')
let generator: TestGenerator

beforeEach(() => {
  generator = new TestGenerator(templateDir, destinationDir, ['.mustache'])
})

afterEach(async () => {
  await rm(destinationDir, { recursive: true })
})

describe('.generate()', () => {
  test('rendered output without changing the file name', async () => {
    expect(await generator.generate(null, 'src/index.js')).toEqual([
      `${templateDir}/src/index.js`,
      `${destinationDir}/src/index.js`,
    ])
    expect((await readFile(`${destinationDir}/src/index.js`)).toString())
      .toMatchInlineSnapshot(`
      "// I have no extra template extensions
      "
    `)
  })

  test('rendered output changing the file name', async () => {
    expect(await generator.generate(null, 'package.json.mustache')).toEqual([
      `${templateDir}/package.json.mustache`,
      `${destinationDir}/package.json`,
    ])
    expect((await readFile(`${destinationDir}/package.json`)).toString())
      .toMatchInlineSnapshot(`
      "{
        "name": "something"
      }
      "
    `)
  })

  test('passing context', async () => {
    await generator.generate({ foo: 'bar' }, 'package.json.mustache')
    expect(generator.renderTemplate).toHaveBeenCalledWith(
      { foo: 'bar' },
      expect.any(String),
    )
  })

  test('throws an error when the file already exists', async () => {
    await mkdir(destinationDir)
    await writeFile(`${destinationDir}/package.json`, '{}')
    await expect(
      generator.generate(null, 'package.json.mustache'),
    ).rejects.toThrowError(FileExistsError)
  })
})

describe('.generateAll()', () => {
  test('renders all templates yielding results', async () => {
    const results: unknown[] = []

    for await (const result of generator.generateAll({ foo: 'bar' })) {
      results.push(result)
    }

    expect(results).toEqual([
      [
        `${templateDir}/package.json.mustache`,
        `${destinationDir}/package.json`,
      ],
      [`${templateDir}/src/index.js`, `${destinationDir}/src/index.js`],
    ])

    expect((await readFile(`${destinationDir}/src/index.js`)).toString())
      .toMatchInlineSnapshot(`
      "// I have no extra template extensions
      "
    `)

    expect((await readFile(`${destinationDir}/package.json`)).toString())
      .toMatchInlineSnapshot(`
      "{
        "name": "something"
      }
      "
    `)

    expect(generator.renderTemplate).toHaveBeenCalledTimes(2)
    expect(generator.renderTemplate).toHaveBeenCalledWith(
      { foo: 'bar' },
      expect.any(String),
    )
  })

  test("yields FileExistsError's", async () => {
    await mkdir(destinationDir)
    await writeFile(`${destinationDir}/package.json`, '{}')
    const results: unknown[] = []

    for await (const result of generator.generateAll({ foo: 'bar' })) {
      results.push(result)
    }

    expect(results[0]).toBeInstanceOf(FileExistsError)
    expect(results[0]).toHaveProperty('templateName', 'package.json.mustache')
    expect(results[0]).toHaveProperty('fileName', 'package.json')
    expect(results[0]).toHaveProperty(
      'destinationPath',
      `${destinationDir}/package.json`,
    )
    expect(results[1]).toEqual([
      `${templateDir}/src/index.js`,
      `${destinationDir}/src/index.js`,
    ])
  })
})
