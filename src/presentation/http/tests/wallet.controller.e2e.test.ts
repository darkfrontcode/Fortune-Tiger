import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createApp } from '../../../../test/test-setup.e2e'

describe('WalletController (e2e)', () => {
  let app: INestApplication
  let walletId: string

  beforeAll(async () => {
    app = await createApp()

    const response = await request(app.getHttpServer())
      .post('/wallets')
      .send({
        playerId: 'wallet-test-player-' + Date.now(),
        initialBalance: {
          amount: '1000.00',
          currency: 'BRL',
        },
      })
      .expect(201)

    walletId = response.body.id
  })



  describe('POST /wallets', () => {
    it('should create a wallet with valid payload', async () => {
      const body = {
        playerId: 'player-test-' + Date.now(),
        initialBalance: {
          amount: '500.00',
          currency: 'BRL',
        },
      }

      const response = await request(app.getHttpServer())
        .post('/wallets')
        .send(body)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('playerId')
      expect(response.body).toHaveProperty('balance')
      expect(response.body).toHaveProperty('version')
    })


  })

  describe('GET /wallets/:walletId', () => {
    it('should return a wallet by walletId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/wallets/${walletId}`)
        .expect(200)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('playerId')
      expect(response.body).toHaveProperty('balance')
      expect(response.body).toHaveProperty('version')
    })
  })

  describe('GET /wallets/:walletId/ledger', () => {
    it('should return ledger page for a wallet', async () => {
      const response = await request(app.getHttpServer())
        .get(`/wallets/${walletId}/ledger`)
        .expect(200)

      expect(response.body).toHaveProperty('items')
      expect(Array.isArray(response.body.items)).toBe(true)
    })

    it('should support pagination with cursor and limit', async () => {
      const query = {
        limit: '10',
      }

      const response = await request(app.getHttpServer())
        .get(`/wallets/${walletId}/ledger`)
        .query(query)
        .expect(200)

      expect(response.body).toHaveProperty('items')
    })
  })

  describe('POST /wallets/:walletId/reconciliation', () => {
    it('should reconcile a wallet', async () => {
      const response = await request(app.getHttpServer())
        .post(`/wallets/${walletId}/reconciliation`)
        .expect(200)

      expect(response.body).toBeDefined()
    })
  })
})
