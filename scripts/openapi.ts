import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { SwaggerFactory } from '../src/presentation/http/factories'

const outputPath = 'docs/api/openapi.json'
const checkFlag = '--check'
const indent = 2
const successfulExitCode = 0
const failureExitCode = 1

const validation = { whitelist: true, forbidNonWhitelisted: true, transform: true }

const mark = {
  step: '>',
  success: 'OK',
  failure: 'ERR',
}

const messages = {
  title: 'Fortune Tiger OpenAPI export',
  written: `Wrote ${outputPath}.`,
  current: `${outputPath} matches the code.`,
  stale: `${outputPath} is stale. Run "bun run openapi:export" and commit the result.`,
  missing: `${outputPath} does not exist. Run "bun run openapi:export" and commit the result.`,
  hint: 'The export boots AppModule, so run "docker compose up -d" and "bun run migration:up" first.',
}

const serialized = async (): Promise<string> => {
  const app = await NestFactory.create(AppModule, { logger: false })

  app.useGlobalPipes(new ValidationPipe(validation))

  try {
    const document = new SwaggerFactory().createDocument(app)

    return `${JSON.stringify(document, undefined, indent)}\n`
  } finally {
    await app.close()
  }
}

const existing = async (): Promise<string | undefined> => {
  const file = Bun.file(outputPath)
  const present = await file.exists()

  return present ? file.text() : undefined
}

const main = async (): Promise<number> => {
  const check = process.argv.includes(checkFlag)

  console.log(`${mark.step} ${messages.title}\n`)

  const document = await serialized()

  if (!check) {
    await Bun.write(outputPath, document)
    console.log(`${mark.success} ${messages.written}`)

    return successfulExitCode
  }

  const current = await existing()

  if (current === undefined) {
    console.error(`${mark.failure} ${messages.missing}`)

    return failureExitCode
  }

  if (current !== document) {
    console.error(`${mark.failure} ${messages.stale}`)

    return failureExitCode
  }

  console.log(`${mark.success} ${messages.current}`)

  return successfulExitCode
}

const fail = (error: unknown): number => {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`\n${mark.failure} ${messages.title}`)
  console.error(`${mark.failure} ${message}`)
  console.error(`${mark.failure} ${messages.hint}`)

  return failureExitCode
}

process.exit(await main().catch(fail))
