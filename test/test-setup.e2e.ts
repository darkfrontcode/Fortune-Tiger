import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module'

const createApp = async (): Promise<INestApplication> => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  const app = module.createNestApplication()

  await app.init()

  return app
}

export { createApp }
