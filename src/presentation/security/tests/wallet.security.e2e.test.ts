import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createSecureApp } from '../test-app'

type Server = ReturnType<INestApplication['getHttpServer']>

const providerHeader = 'x-provider-id'

const unique = (): string => Math.random().toString(36).slice(2, 10)

const openWallet = async (
  server: Server,
  playerId: string,
  amount: string,
): Promise<{ id: string; playerId: string }> => {
  const response = await request(server)
    .post('/wallets')
    .send({
      playerId,
      initialBalance: { amount, currency: 'BRL' },
    })
    .expect(201)

  return { id: response.body.id, playerId: response.body.playerId }
}

const bet = async (
  server: Server,
  walletId: string,
  playerId: string,
  amount: string,
  externalTransactionId: string,
): Promise<SupertestResponse> => {
  const body = {
    providerId: 'provider-a',
    externalTransactionId,
    playerId,
    walletId,
    roundId: 'round-a',
    gameId: 'fortune-tiger',
    kind: 'BET',
    money: { amount, currency: 'BRL' },
  }

  return request(server)
    .post('/wagering/transactions')
    .set(providerHeader, 'provider-a')
    .set('idempotency-key', `security:${externalTransactionId}`)
    .send(body)
}

type SupertestResponse = {
  status: number
  body: {
    id?: string
    failureCode?: string
    status?: string
    balance?: { amount?: string }
    idempotentReplay?: boolean
  }
}

describe('Security / wallet', () => {
  let app: INestApplication
  let server: Server

  beforeAll(async () => {
    app = await createSecureApp()
    server = app.getHttpServer()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('insufficient balance', () => {
    it('rejects a BET beyond the balance with INSUFFICIENT_FUNDS and leaves the balance intact', async () => {
      const external = `short-bet-${unique()}`
      const { id, playerId } = await openWallet(server, `sec-wallet-short-${unique()}`, '100.00')

      const rejected = await bet(server, id, playerId, '150.00', external)

      expect(rejected.status).toBe(422)
      expect(rejected.body.failureCode).toBe('INSUFFICIENT_FUNDS')
      expect(rejected.body.status).toBe('REJECTED')

      const wallet = await request(server).get(`/wallets/${id}`).expect(200)

      expect(wallet.body.balance.amount).toBe('100.00')

      const replayed = await bet(server, id, playerId, '150.00', external)

      expect(replayed.status).toBe(200)
      expect(replayed.body.idempotentReplay).toBe(true)
      expect(replayed.body.failureCode).toBe('INSUFFICIENT_FUNDS')
    })
  })

  describe('malformed amounts', () => {
    it('rejects a negative opening balance with 400', async () => {
      await request(server)
        .post('/wallets')
        .send({
          playerId: `sec-wallet-negative-${unique()}`,
          initialBalance: { amount: '-50.00', currency: 'BRL' },
        })
        .expect(400)
    })

    it('rejects an opening amount with more than two decimal places with 400', async () => {
      await request(server)
        .post('/wallets')
        .send({
          playerId: `sec-wallet-scale-${unique()}`,
          initialBalance: { amount: '10.001', currency: 'BRL' },
        })
        .expect(400)
    })

    it('rejects a non-decimal amount with 400', async () => {
      await request(server)
        .post('/wallets')
        .send({
          playerId: `sec-wallet-nonnumeric-${unique()}`,
          initialBalance: { amount: 'one hundred', currency: 'BRL' },
        })
        .expect(400)
    })

    it('rejects an empty amount with 400', async () => {
      await request(server)
        .post('/wallets')
        .send({
          playerId: `sec-wallet-empty-${unique()}`,
          initialBalance: { amount: '', currency: 'BRL' },
        })
        .expect(400)
    })

    it('rejects a bare-integer amount with 400', async () => {
      await request(server)
        .post('/wallets')
        .send({
          playerId: `sec-wallet-bare-${unique()}`,
          initialBalance: { amount: '100', currency: 'BRL' },
        })
        .expect(400)
    })

    it('rejects a currency that is not uppercase ISO-4217 with 400', async () => {
      await request(server)
        .post('/wallets')
        .send({
          playerId: `sec-wallet-currencycase-${unique()}`,
          initialBalance: { amount: '10.00', currency: 'brl' },
        })
        .expect(400)
    })
  })

  describe('foreign currency', () => {
    it('rejects a BET in a currency other than the wallet with CURRENCY_MISMATCH', async () => {
      const { id, playerId } = await openWallet(server, `sec-wallet-currency-${unique()}`, '100.00')

      const response = await request(server)
        .post('/wagering/transactions')
        .set(providerHeader, 'provider-a')
        .set('idempotency-key', `security:currency-bet-${unique()}`)
        .send({
          providerId: 'provider-a',
          externalTransactionId: `currency-bet-${unique()}`,
          playerId,
          walletId: id,
          roundId: 'round-a',
          gameId: 'fortune-tiger',
          kind: 'BET',
          money: { amount: '10.00', currency: 'USD' },
        })
        .expect(422)

      expect(response.body.failureCode).toBe('CURRENCY_MISMATCH')

      const reconcile = await request(server).post(`/wallets/${id}/reconciliation`).expect(200)

      expect(reconcile.body.consistent).toBe(true)
      expect(reconcile.body.checkedEntries).toBe(1)
    })
  })

  describe('access to another player', () => {
    it('answers 404 for an unknown wallet id', async () => {
      await request(server).get('/wallets/00000000-0000-7000-0000-000000000000').expect(404)
    })
  })

  describe('ledger integrity', () => {
    it('keeps the reconciliation consistent after a rejected bet', async () => {
      const { id, playerId } = await openWallet(server, `sec-wallet-ledger-${unique()}`, '100.00')

      await bet(server, id, playerId, '30.00', `ledger-bet-ok-${unique()}`)
      await bet(server, id, playerId, '500.00', `ledger-bet-rejected-${unique()}`)

      const reconcile = await request(server).post(`/wallets/${id}/reconciliation`).expect(200)

      expect(reconcile.body.consistent).toBe(true)
      expect(reconcile.body.difference.amount).toBe('0.00')
      expect(reconcile.body.storedBalance.amount).toBe('70.00')
      expect(reconcile.body.checkedEntries).toBe(2)
    })
  })

  describe('concurrency', () => {
    it('serializes two parallel bets and never produces a negative balance', async () => {
      const { id, playerId } = await openWallet(server, `sec-wallet-race-${unique()}`, '100.00')

      const first = bet(server, id, playerId, '80.00', `race-bet-1-${unique()}`)
      const second = bet(server, id, playerId, '80.00', `race-bet-2-${unique()}`)
      const results = await Promise.all([first, second])

      const statuses = results.map((result) => result.status).sort()
      const processed = results
        .map((result) => result.body.status)
        .filter((status) => status === 'PROCESSED')
      const codes = results
        .map((result) => result.body.failureCode)
        .filter((code) => code !== undefined)

      expect(statuses).toContain(200)
      expect(processed.length).toBe(1)
      expect(codes.length).toBe(1)
      expect(codes[0]).toBe('INSUFFICIENT_FUNDS')

      const wallet = await request(server).get(`/wallets/${id}`).expect(200)

      expect(wallet.body.balance.amount).toBe('20.00')

      const reconcile = await request(server).post(`/wallets/${id}/reconciliation`).expect(200)

      expect(reconcile.body.consistent).toBe(true)
      expect(reconcile.body.storedBalance.amount).toBe('20.00')
    })
  })
})
