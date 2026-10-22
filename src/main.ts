import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Environment } from './infrastructure/environment'

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule)
  const environment = app.get(Environment)

  app.enableShutdownHooks()
  await app.listen(environment.port)
}

await bootstrap()
