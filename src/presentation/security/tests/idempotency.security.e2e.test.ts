import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createSecureApp } from '../test-app'

type Server = ReturnType<INestApplication['getHttpServer']>

type SubmitBody = Record<string, unknown> & {
  money: { amount: string; currency: string }
}

type SupertestResponse = {
  status: number
  body: {
    transactionId?: string
    status?: string
    balance?: { amount?: string }
    idempotentReplay?: boolean
    failureCode?: string
  }
}

const providerHeader = 'x-provider-id'

const unique = (): string => Math.random().toString(36).slice(2, 10)

const openWallet = async (
  server: Server,
  amount: string,
): Promise<{ id: string; playerId: string }> => {
  const playerId = `sec-idem-player-${unique()}`
  const response = await request(server)
    .post('/wallets')
    .send({
      playerId,
      initialBalance: { amount, currency: 'BRL' },
    })
    .expect(201)

  return { id: response.body.id, playerId }
}

const submit = (
  server: Server,
  body: SubmitBody,
  key: string,
): Promise<SupertestResponse> =>
  request(server)
    .post('/wagering/transactions')
    .set(providerHeader, 'provider-a')
    .set('idempotency-key', key)
    .send(body) as Promise<SupertestResponse>

const betBody = (
  playerId: string,
  walletId: string,
  externalTransactionId: string,
  amount: string,
): SubmitBody => ({
  providerId: 'provider-a',
  externalTransactionId,
  playerId,
  walletId,
  roundId: `round-${unique()}`,
  gameId: 'fortune-tiger',
  kind: 'BET',
  money: { amount, currency: 'BRL' },
})

describe('Security / idempotency', () => {
  let app: INestApplication
  let server: Server

  beforeAll(async () => {
    app = await createSecureApp()
    server = app.getHttpServer()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('duplicate delivery', () => {
    it('answers a single debit for the same key sent twice', async () => {
      const { id, playerId } = await openWallet(server, '100.00')
      const external = `dup-${unique()}`
      const key = `security:${external}`
      const body = betBody(playerId, id, external, '30.00')

      const first = await submit(server, body, key)

      expect(first.status).toBe(200)
      expect(first.body.status).toBe('PROCESSED')
      expect(first.body.idempotentReplay).toBe(false)

      const second = await submit(server, body, key)

      expect(second.status).toBe(200)
      expect(second.body.idempotentReplay).toBe(true)
      expect(second.body.transactionId).toBe(first.body.transactionId)

      const reconcile = await request(server).post(`/wallets/${id}/reconciliation`).expect(200)

      expect(reconcile.body.consistent).toBe(true)
      expect(reconcile.body.storedBalance.amount).toBe('70.00')
      expect(reconcile.body.checkedEntries).toBe(2)
    })
  })

  describe('different payload', () => {
    it('answers 409 for the same key with a different amount and does not change the balance', async () => {
      const { id, playerId } = await openWallet(server, '100.00')
      const key = `security:conflict-${unique()}`
      const external = `conflict-${unique()}`
      const first = betBody(playerId, id, external, '30.00')
      const different = betBody(playerId, id, `conflict-2-${unique()}`, '50.00')

      const original = await submit(server, first, key)

      expect(original.status).toBe(200)

      const conflict = await submit(server, different, key)

      expect(conflict.status).toBe(409)
      expect(conflict.body.failureCode).toBe('IDEMPOTENCY_PAYLOAD_CONFLICT')

      const reconcile = await request(server).post(`/wallets/${id}/reconciliation`).expect(200)

      expect(reconcile.body.consistent).toBe(true)
      expect(reconcile.body.storedBalance.amount).toBe('70.00')
      expect(reconcile.body.checkedEntries).toBe(2)
    })
  })

  describe('repeat after failure', () => {
    it('produces one debit when the first attempt is rejected and a new key succeeds', async () => {
      const { id, playerId } = await openWallet(server, '100.00')
      const rejected = await submit(
        server,
        betBody(playerId, id, `fail-${unique()}`, '150.00'),
        `security:fail-${unique()}`,
      )

      expect(rejected.status).toBe(422)
      expect(rejected.body.failureCode).toBe('INSUFFICIENT_FUNDS')

      const retry = await submit(
        server,
        betBody(playerId, id, `retry-${unique()}`, '40.00'),
        `security:retry-${unique()}`,
      )

      expect(retry.status).toBe(200)
      expect(retry.body.status).toBe('PROCESSED')

      const reconcile = await request(server).post(`/wallets/${id}/reconciliation`).expect(200)

      expect(reconcile.body.consistent).toBe(true)
      expect(reconcile.body.storedBalance.amount).toBe('60.00')
      expect(reconcile.body.checkedEntries).toBe(2)
    })

    it('produces one credit when a REFUND fails on the first attempt and succeeds on the retry', async () => {
      const { id, playerId } = await openWallet(server, '100.00')
      const betExternal = `bet-refundbase-${unique()}`
      const betRequest = betBody(playerId, id, betExternal, '30.00')
      const bet = await submit(
        server,
        betRequest,
        `security:bet-refundbase-${unique()}`,
      )

      expect(bet.status).toBe(200)

      const refused = await submit(
        server,
        {
          ...betBody(playerId, id, `refund-bad-${unique()}`, '30.00'),
          kind: 'REFUND',
          money: { amount: '30.00', currency: 'BRL' },
        },
        `security:refund-bad-${unique()}`,
      )

      expect(refused.status).toBe(400)

      const refund = await submit(
        server,
        {
          ...betBody(playerId, id, `refund-good-${unique()}`, '30.00'),
          kind: 'REFUND',
          referenceExternalTransactionId: betExternal,
          roundId: betRequest.roundId,
          money: { amount: '30.00', currency: 'BRL' },
        },
        `security:refund-good-${unique()}`,
      )

      expect(refund.status).toBe(200)
      expect(refund.body.status).toBe('PROCESSED')

      const reconcile = await request(server).post(`/wallets/${id}/reconciliation`).expect(200)

      expect(reconcile.body.consistent).toBe(true)
      expect(reconcile.body.storedBalance.amount).toBe('100.00')
    })
  })

  describe('replay of a terminal result', () => {
    it('answers 200 with the original failureCode for a replayed REJECTED wager', async () => {
      const { id, playerId } = await openWallet(server, '100.00')
      const external = `term-${unique()}`
      const key = `security:${external}`
      const body = betBody(playerId, id, external, '150.00')

      const rejected = await submit(server, body, key)

      expect(rejected.status).toBe(422)
      expect(rejected.body.status).toBe('REJECTED')

      const replayed = await submit(server, body, key)

      expect(replayed.status).toBe(200)
      expect(replayed.body.idempotentReplay).toBe(true)
      expect(replayed.body.failureCode).toBe('INSUFFICIENT_FUNDS')

      const reconcile = await request(server).post(`/wallets/${id}/reconciliation`).expect(200)

      expect(reconcile.body.consistent).toBe(true)
      expect(reconcile.body.storedBalance.amount).toBe('100.00')
      expect(reconcile.body.checkedEntries).toBe(1)
    })
  })
})
