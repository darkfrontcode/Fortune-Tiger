import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { HttpModule } from '../http.module'

const providerHeader = 'x-provider-id'
const idempotencyHeader = 'idempotency-key'
const providerId = 'independence-provider'
const unreachableMongo = 'mongodb://127.0.0.1:1/fortune_tiger_audit'
const original = process.env.MONGODB_URL

const createApplication = async (): Promise<INestApplication> => {
  const module = await Test.createTestingModule({ imports: [HttpModule] }).compile()
  const app = module.createNestApplication()

  await app.init()

  return app
}

describe('Financial path with the audit store down', () => {
  let app: INestApplication

  beforeAll(async () => {
    process.env.MONGODB_URL = unreachableMongo
    app = await createApplication()
  })

  afterAll(async () => {
    await app.close()

    if (original === undefined) {
      delete process.env.MONGODB_URL

      return
    }

    process.env.MONGODB_URL = original
  })

  it('should create a wallet and process a wager without the audit store', async () => {
    const playerId = `independence-player-${Date.now()}`
    const wallet = await request(app.getHttpServer())
      .post('/wallets')
      .send({ playerId, initialBalance: { amount: '100.00', currency: 'BRL' } })
      .expect(201)

    const externalTransactionId = `independence-external-${Date.now()}`
    const response = await request(app.getHttpServer())
      .post('/wagering/transactions')
      .set(providerHeader, providerId)
      .set(idempotencyHeader, `${providerId}:${externalTransactionId}`)
      .send({
        providerId,
        externalTransactionId,
        playerId,
        walletId: wallet.body.id,
        roundId: 'independence-round',
        gameId: 'fortune-tiger',
        kind: 'BET',
        money: { amount: '10.00', currency: 'BRL' },
      })
      .expect(200)

    expect(response.body.status).toBe('PROCESSED')
    expect(response.body.balance).toEqual({ amount: '90.00', currency: 'BRL' })
  })
})
