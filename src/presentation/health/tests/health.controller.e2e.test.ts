import { beforeAll, describe, expect, it } from 'bun:test'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { metricNames } from '@application/observability'
import { createApp } from '../../../../test/test-setup.e2e'

const providerHeader = 'x-provider-id'
const idempotencyHeader = 'idempotency-key'
const providerId = 'provider-metrics'

describe('HealthController (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createApp()
  })

  describe('GET /health/live', () => {
    it('should return liveness status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/live')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'live')
    })
  })

  describe('GET /health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'ready')
    })
  })

  describe('GET /metrics', () => {
    it('should return the counter of the wager that the application processed', async () => {
      const stamp = Date.now()
      const walletResponse = await request(app.getHttpServer())
        .post('/wallets')
        .send({
          playerId: `metrics-player-${stamp}`,
          initialBalance: { amount: '1000.00', currency: 'BRL' },
        })
        .expect(201)

      await request(app.getHttpServer())
        .post('/wagering/transactions')
        .set(providerHeader, providerId)
        .set(idempotencyHeader, `${providerId}:bet-${stamp}`)
        .send({
          providerId,
          externalTransactionId: `bet-${stamp}`,
          playerId: walletResponse.body.playerId,
          walletId: walletResponse.body.id,
          roundId: `round-${stamp}`,
          gameId: 'fortune-tiger',
          kind: 'BET',
          money: { amount: '100.00', currency: 'BRL' },
        })
        .expect(200)

      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200)

      expect(response.headers['content-type']).toContain('text/plain')
      expect(response.text).toContain(`${metricNames.transactionProcessed} 1`)
      expect(response.text).toContain(`${metricNames.transactionLatency}_count 1`)
    })
  })
})
