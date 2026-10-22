import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

const defaultPort = 3000

const bootstrap = async (): Promise<void> => {
  const port = Number(process.env.PORT ?? defaultPort)
  const app = await NestFactory.create(AppModule)

  app.enableShutdownHooks()
  await app.listen(port)
}

await bootstrap()
