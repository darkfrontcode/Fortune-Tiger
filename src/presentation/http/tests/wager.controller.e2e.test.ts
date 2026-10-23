import { beforeAll, describe, expect, it } from 'bun:test'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createApp } from '../../../../test/test-setup.e2e'

const providerHeader = 'x-provider-id'
const idempotencyHeader = 'idempotency-key'

describe('WagerController (e2e)', () => {
  let app: INestApplication
  let walletId: string
  let playerId: string

  beforeAll(async () => {
    app = await createApp()

    const walletResponse = await request(app.getHttpServer())
      .post('/wallets')
      .send({
        playerId: `wager-test-player-${Date.now()}`,
        initialBalance: {
          amount: '1000.00',
          currency: 'BRL',
        },
      })
      .expect(201)

    walletId = walletResponse.body.id
    playerId = walletResponse.body.playerId
  })

  describe('POST /wagering/transactions', () => {
    it('should require idempotency-key header', async () => {
      const body = {
        providerId: 'provider-123',
        externalTransactionId: 'ext-123',
        playerId,
        walletId,
        roundId: 'round-123',
        gameId: 'game-123',
        kind: 'BET',
        money: {
          amount: '100.00',
          currency: 'BRL',
        },
      }

      await request(app.getHttpServer())
        .post('/wagering/transactions')
        .set(providerHeader, 'provider-123')
        .send(body)
        .expect(400)
    })

    it('should submit a wager with valid payload', async () => {
      const stamp = Date.now()
      const body = {
        providerId: 'provider-123',
        externalTransactionId: `ext-submit-${stamp}`,
        playerId,
        walletId,
        roundId: 'round-123',
        gameId: 'game-123',
        kind: 'BET',
        money: {
          amount: '100.00',
          currency: 'BRL',
        },
      }

      const response = await request(app.getHttpServer())
        .post('/wagering/transactions')
        .set(providerHeader, 'provider-123')
        .set(idempotencyHeader, `key-submit-${stamp}`)
        .send(body)
        .expect([200, 201])

      expect(response.body).toHaveProperty('transactionId')
      expect(response.body).toHaveProperty('status')
      expect(response.body).toHaveProperty('balance')
      expect(response.body).toHaveProperty('idempotentReplay')
    })

    it('should reject invalid amount scale', async () => {
      const body = {
        providerId: 'provider-123',
        externalTransactionId: 'ext-invalid-scale',
        playerId,
        walletId,
        roundId: 'round-123',
        gameId: 'game-123',
        kind: 'BET',
        money: {
          amount: '100.001',
          currency: 'BRL',
        },
      }

      await request(app.getHttpServer())
        .post('/wagering/transactions')
        .set(providerHeader, 'provider-123')
        .set(idempotencyHeader, 'key-invalid-scale')
        .send(body)
        .expect(400)
    })

    it('should reject invalid currency case', async () => {
      const body = {
        providerId: 'provider-123',
        externalTransactionId: 'ext-invalid-currency',
        playerId,
        walletId,
        roundId: 'round-123',
        gameId: 'game-123',
        kind: 'BET',
        money: {
          amount: '100.00',
          currency: 'brl',
        },
      }

      await request(app.getHttpServer())
        .post('/wagering/transactions')
        .set(providerHeader, 'provider-123')
        .set(idempotencyHeader, 'key-invalid-currency')
        .send(body)
        .expect(400)
    })

    it('should detect idempotency conflict with different payload', async () => {
      const externalId = `ext-conflict-${Date.now()}`
      const key = `key-conflict-${Date.now()}`

      const body1 = {
        providerId: 'provider-123',
        externalTransactionId: externalId,
        playerId,
        walletId,
        roundId: 'round-123',
        gameId: 'game-123',
        kind: 'BET',
        money: {
          amount: '100.00',
          currency: 'BRL',
        },
      }

      await request(app.getHttpServer())
        .post('/wagering/transactions')
        .set(providerHeader, 'provider-123')
        .set(idempotencyHeader, key)
        .send(body1)
        .expect([200, 201])

      const body2 = {
        ...body1,
        money: {
          amount: '50.00',
          currency: 'BRL',
        },
      }

      await request(app.getHttpServer())
        .post('/wagering/transactions')
        .set(providerHeader, 'provider-123')
        .set(idempotencyHeader, key)
        .send(body2)
        .expect(409)
    })
  })

  describe('GET /wagering/transactions/:transactionId', () => {
    it('should return a wager by transactionId', async () => {
      const stamp = Date.now()
      const body = {
        providerId: 'provider-123',
        externalTransactionId: `ext-by-id-${stamp}`,
        playerId,
        walletId,
        roundId: 'round-123',
        gameId: 'game-123',
        kind: 'BET',
        money: {
          amount: '50.00',
          currency: 'BRL',
        },
      }

      const submitResponse = await request(app.getHttpServer())
        .post('/wagering/transactions')
        .set(providerHeader, 'provider-123')
        .set(idempotencyHeader, `key-by-id-${stamp}`)
        .send(body)
        .expect([200, 201])

      const transactionId = submitResponse.body.transactionId

      const response = await request(app.getHttpServer())
        .get(`/wagering/transactions/${transactionId}`)
        .expect(200)

      expect(response.body).toHaveProperty('transactionId')
      expect(response.body).toHaveProperty('providerId')
      expect(response.body).toHaveProperty('externalTransactionId')
    })
  })

  describe('GET /providers/:providerId/wagering/transactions/:externalTransactionId', () => {
    it('should return a wager by provider and external transaction id', async () => {
      const providerId = 'provider-123'
      const stamp = Date.now()
      const externalTransactionId = `ext-by-provider-${stamp}`

      const body = {
        providerId,
        externalTransactionId,
        playerId,
        walletId,
        roundId: 'round-123',
        gameId: 'game-123',
        kind: 'BET',
        money: {
          amount: '25.00',
          currency: 'BRL',
        },
      }

      await request(app.getHttpServer())
        .post('/wagering/transactions')
        .set(providerHeader, providerId)
        .set(idempotencyHeader, `key-by-provider-${stamp}`)
        .send(body)
        .expect([200, 201])

      const response = await request(app.getHttpServer())
        .get(`/providers/${providerId}/wagering/transactions/${externalTransactionId}`)
        .expect(200)

      expect(response.body).toHaveProperty('transactionId')
      expect(response.body).toHaveProperty('providerId')
      expect(response.body).toHaveProperty('externalTransactionId')
    })
  })
})
