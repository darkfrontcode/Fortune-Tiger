import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Environment } from './infrastructure/environment'
import { LoggerService } from './infrastructure/observability'

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })
  const environment = app.get(Environment)
  const logger = app.get(LoggerService)

  app.useLogger(logger)
  app.enableShutdownHooks()

  await app.listen(environment.port)
}

await bootstrap()
