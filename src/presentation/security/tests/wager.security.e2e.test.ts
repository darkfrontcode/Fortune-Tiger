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
  const playerId = `sec-wager-player-${unique()}`
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
  currency = 'BRL',
): SubmitBody => ({
  providerId: 'provider-a',
  externalTransactionId,
  playerId,
  walletId,
  roundId: `round-${unique()}`,
  gameId: 'fortune-tiger',
  kind: 'BET',
  money: { amount, currency },
})

describe('Security / wager', () => {
  let app: INestApplication
  let server: Server

  beforeAll(async () => {
    app = await createSecureApp()
    server = app.getHttpServer()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('invalid bet amount', () => {
    it('rejects a BET with a negative amount with 400', async () => {
      const { id, playerId } = await openWallet(server, '100.00')

      const response = await submit(
        server,
        betBody(playerId, id, `negative-${unique()}`, '-10.00'),
        `security:negative-${unique()}`,
      )

      expect(response.status).toBe(400)
    })

    it('rejects a BET with an over-scaled amount with 400', async () => {
      const { id, playerId } = await openWallet(server, '100.00')

      const response = await submit(
        server,
        betBody(playerId, id, `scale-${unique()}`, '10.001'),
        `security:scale-${unique()}`,
      )

      expect(response.status).toBe(400)
    })

    it('rejects a BET with a malformed money payload with 400', async () => {
      const { id, playerId } = await openWallet(server, '100.00')

      const body: SubmitBody = {
        providerId: 'provider-a',
        externalTransactionId: `malformed-${unique()}`,
        playerId,
        walletId: id,
        roundId: `round-${unique()}`,
        gameId: 'fortune-tiger',
        kind: 'BET',
        money: { amount: 'not-a-number', currency: 'BRL' },
      }
      const response = await submit(server, body, `security:malformed-${unique()}`)

      expect(response.status).toBe(400)
      expect(response.body.failureCode).toBeUndefined()
    })
  })

  describe('duplicate settlement', () => {
    it('debites once and answers a replay with idempotentReplay true', async () => {
      const { id, playerId } = await openWallet(server, '100.00')
      const external = `duplicate-${unique()}`
      const key = `security:${external}`
      const body = betBody(playerId, id, external, '30.00')

      const first = await submit(server, body, key)
      const second = await submit(server, body, key)

      expect(first.status).toBe(200)
      expect(first.body.status).toBe('PROCESSED')
      expect(second.status).toBe(200)
      expect(second.body.idempotentReplay).toBe(true)
      expect(second.body.transactionId).toBe(first.body.transactionId)

      const reconcile = await request(server).post(`/wallets/${id}/reconciliation`).expect(200)

      expect(reconcile.body.consistent).toBe(true)
      expect(reconcile.body.storedBalance.amount).toBe('70.00')
      expect(reconcile.body.checkedEntries).toBe(2)
    })
  })

  describe('OPENING is internal', () => {
    it('answers 422 with OPENING_NOT_ALLOWED', async () => {
      const { id, playerId } = await openWallet(server, '100.00')

      const response = await submit(
        server,
        {
          ...betBody(playerId, id, `opening-${unique()}`, '100.00'),
          kind: 'OPENING',
        },
        `security:opening-${unique()}`,
      )

      expect(response.status).toBe(422)
      expect(response.body.failureCode).toBe('OPENING_NOT_ALLOWED')
      expect(response.body.status).toBe('REJECTED')

      const reconcile = await request(server).post(`/wallets/${id}/reconciliation`).expect(200)

      expect(reconcile.body.consistent).toBe(true)
    })
  })

  describe('reversal reference', () => {
    it('answers 400 for a REFUND without a reference', async () => {
      const { id, playerId } = await openWallet(server, '100.00')
      const body = {
        providerId: 'provider-a',
        externalTransactionId: `refund-noref-${unique()}`,
        playerId,
        walletId: id,
        roundId: `round-${unique()}`,
        gameId: 'fortune-tiger',
        kind: 'REFUND',
        money: { amount: '10.00', currency: 'BRL' },
      }

      const response = await submit(server, body, `security:refund-noref-${unique()}`)

      expect(response.status).toBe(400)
    })

    it('answers 400 for a ROLLBACK without a reference', async () => {
      const { id, playerId } = await openWallet(server, '100.00')
      const body = {
        providerId: 'provider-a',
        externalTransactionId: `rollback-noref-${unique()}`,
        playerId,
        walletId: id,
        roundId: `round-${unique()}`,
        gameId: 'fortune-tiger',
        kind: 'ROLLBACK',
        money: { amount: '10.00', currency: 'BRL' },
      }

      const response = await submit(server, body, `security:rollback-noref-${unique()}`)

      expect(response.status).toBe(400)
    })

    it('answers 202 PENDING_REFERENCE for a REFUND whose reference is missing', async () => {
      const { id, playerId } = await openWallet(server, '100.00')
      const external = `missing-${unique()}`
      const body = {
        providerId: 'provider-a',
        externalTransactionId: `refund-missing-${unique()}`,
        playerId,
        walletId: id,
        roundId: `round-${unique()}`,
        gameId: 'fortune-tiger',
        kind: 'REFUND',
        referenceExternalTransactionId: external,
        money: { amount: '10.00', currency: 'BRL' },
      }

      const response = await submit(server, body, `security:refund-missing-${unique()}`)

      expect(response.status).toBe(202)
      expect(response.body.status).toBe('PENDING_REFERENCE')

      const reconcile = await request(server).post(`/wallets/${id}/reconciliation`).expect(200)

      expect(reconcile.body.consistent).toBe(true)
      expect(reconcile.body.storedBalance.amount).toBe('100.00')
    })
  })

  describe('reference discipline', () => {
    it('refuses a REFUND that points at a WIN and never moves the balance', async () => {
      const { id, playerId } = await openWallet(server, '100.00')
      const round = `round-${unique()}`
      const winExternal = `win-${unique()}`
      const refundExternal = `refund-win-${unique()}`
      const winBody = {
        providerId: 'provider-a',
        externalTransactionId: winExternal,
        playerId,
        walletId: id,
        roundId: round,
        gameId: 'fortune-tiger',
        kind: 'WIN',
        referenceExternalTransactionId: undefined,
        money: { amount: '10.00', currency: 'BRL' },
      }
      const refundBody = {
        providerId: 'provider-a',
        externalTransactionId: refundExternal,
        playerId,
        walletId: id,
        roundId: round,
        gameId: 'fortune-tiger',
        kind: 'REFUND',
        referenceExternalTransactionId: winExternal,
        money: { amount: '10.00', currency: 'BRL' },
      }

      const win = await submit(server, winBody, `security:win-${unique()}`)

      expect(win.status).toBe(200)
      expect(win.body.status).toBe('PROCESSED')

      const refund = await submit(server, refundBody, `security:refund-win-${unique()}`)

      expect(refund.status).toBe(422)
      expect(refund.body.failureCode).toBe('INVALID_REFERENCE_KIND')

      const reconcile = await request(server).post(`/wallets/${id}/reconciliation`).expect(200)

      expect(reconcile.body.consistent).toBe(true)
      expect(reconcile.body.storedBalance.amount).toBe('110.00')
    })

    it('refuses a second reversal of the same reference', async () => {
      const { id, playerId } = await openWallet(server, '100.00')
      const betExternal = `bet-ref-${unique()}`
      const rollbackExternal = `rollback-ref-${unique()}`
      const betRefBody = {
        providerId: 'provider-a',
        externalTransactionId: betExternal,
        playerId,
        walletId: id,
        roundId: `round-${unique()}`,
        gameId: 'fortune-tiger',
        kind: 'BET',
        money: { amount: '20.00', currency: 'BRL' },
      }
      const rollbackBody = {
        providerId: 'provider-a',
        externalTransactionId: rollbackExternal,
        playerId,
        walletId: id,
        roundId: betRefBody.roundId,
        gameId: 'fortune-tiger',
        kind: 'ROLLBACK',
        referenceExternalTransactionId: betExternal,
        money: { amount: '20.00', currency: 'BRL' },
      }

      const bet = await submit(server, betRefBody, `security:bet-ref-${unique()}`)

      expect(bet.status).toBe(200)

      const rollback = await submit(server, rollbackBody, `security:rollback-1-${unique()}`)

      expect(rollback.status).toBe(200)
      expect(rollback.body.status).toBe('PROCESSED')

      const second = await submit(
        server,
        { ...rollbackBody, externalTransactionId: `rollback-ref-2-${unique()}` },
        `security:rollback-2-${unique()}`,
      )

      expect(second.status).toBe(422)
      expect(second.body.failureCode).toBe('REFERENCE_ALREADY_REVERSED')

      const reconcile = await request(server).post(`/wallets/${id}/reconciliation`).expect(200)

      expect(reconcile.body.consistent).toBe(true)
      expect(reconcile.body.storedBalance.amount).toBe('100.00')
    })

    it('restores the balance through a valid first reversal without going negative', async () => {
      const { id, playerId } = await openWallet(server, '10.00')
      const betExternal = `bet-low-${unique()}`
      const betRequest = betBody(playerId, id, betExternal, '10.00')
      const bet = await submit(
        server,
        betRequest,
        `security:bet-low-${unique()}`,
      )

      expect(bet.status).toBe(200)

      const rollback = await submit(
        server,
        {
          ...betBody(playerId, id, `rollback-low-${unique()}`, '10.00'),
          kind: 'ROLLBACK',
          referenceExternalTransactionId: betExternal,
          roundId: betRequest.roundId,
        },
        `security:rollback-low-1-${unique()}`,
      )

      expect(rollback.status).toBe(200)

      const wallet = await request(server).get(`/wallets/${id}`).expect(200)

      expect(wallet.body.balance.amount).toBe('10.00')
    })
  })

  describe('result manipulation', () => {
    it('cannot fabricate a credit: a BET beyond the balance rejects and writes no ledger entry', async () => {
      const { id, playerId } = await openWallet(server, '50.00')

      const response = await submit(
        server,
        betBody(playerId, id, `over-${unique()}`, '100.00'),
        `security:over-${unique()}`,
      )

      expect(response.status).toBe(422)
      expect(response.body.failureCode).toBe('INSUFFICIENT_FUNDS')

      const reconcile = await request(server).post(`/wallets/${id}/reconciliation`).expect(200)

      expect(reconcile.body.consistent).toBe(true)
      expect(reconcile.body.checkedEntries).toBe(1)
      expect(reconcile.body.storedBalance.amount).toBe('50.00')
    })
  })

  describe('consistency', () => {
    it('answers a LOSS with 200 without changing the balance and reads the same status', async () => {
      const { id, playerId } = await openWallet(server, '100.00')
      const external = `loss-${unique()}`
      const lossBody = {
        providerId: 'provider-a',
        externalTransactionId: external,
        playerId,
        walletId: id,
        roundId: `round-${unique()}`,
        gameId: 'fortune-tiger',
        kind: 'LOSS',
        money: { amount: '10.00', currency: 'BRL' },
      }

      const response = await submit(server, lossBody, `security:loss-${unique()}`)

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('PROCESSED')
      expect(response.body.transactionId).toBeDefined()

      const read = await request(server)
        .get(`/wagering/transactions/${response.body.transactionId}`)
        .expect(200)

      expect(read.body.status).toBe('PROCESSED')
      expect(read.body.kind).toBe('LOSS')

      const reconcile = await request(server).post(`/wallets/${id}/reconciliation`).expect(200)

      expect(reconcile.body.consistent).toBe(true)
      expect(reconcile.body.storedBalance.amount).toBe('100.00')
      expect(reconcile.body.checkedEntries).toBe(1)
    })
  })
})
