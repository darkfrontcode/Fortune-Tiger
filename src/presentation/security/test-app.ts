import { ValidationPipe } from '@nestjs/common'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../../app.module'
import { SwaggerFactory } from '../http/factories'

const validation = { whitelist: true, forbidNonWhitelisted: true, transform: true }

export const createSecureApp = async (): Promise<INestApplication> => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  const app = module.createNestApplication()

  app.useGlobalPipes(new ValidationPipe(validation))
  new SwaggerFactory().mountDocs(app)

  await app.init()

  return app
}
