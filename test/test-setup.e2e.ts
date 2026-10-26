import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module'
import { SwaggerFactory } from '../src/presentation/http/factories'

const createApp = async (): Promise<INestApplication> => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  const app = module.createNestApplication()

  new SwaggerFactory().mountDocs(app)

  await app.init()

  return app
}

export { createApp }
