import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Environment } from '@infrastructure/environment'
import { LoggerService } from '@infrastructure/observability'
import { SwaggerFactory } from '@presentation/http/factories'

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })
  const environment = app.get(Environment)
  const logger = app.get(LoggerService)

  app.useLogger(logger)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  app.enableShutdownHooks()
  new SwaggerFactory().mountDocs(app)

  await app.listen(environment.port)
}

await bootstrap()
