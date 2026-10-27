import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createSecureApp } from '../test-app'

type Server = ReturnType<INestApplication['getHttpServer']>

type SupertestResponse = {
  status: number
  body: {
    transactionId?: string
    status?: string
    providerId?: string
    items?: unknown[]
  }
}

const providerHeader = 'x-provider-id'

const unique = (): string => Math.random().toString(36).slice(2, 10)

const openWallet = async (
  server: Server,
  amount: string,
): Promise<{ id: string; playerId: string }> => {
  const playerId = `sec-auth-player-${unique()}`
  const response = await request(server)
    .post('/wallets')
    .send({
      playerId,
      initialBalance: { amount, currency: 'BRL' },
    })
    .expect(201)

  return { id: response.body.id, playerId }
}

const submitBet = (
  server: Server,
  body: Record<string, unknown>,
  providerId: string,
  key: string,
): Promise<SupertestResponse> =>
  request(server)
    .post('/wagering/transactions')
    .set(providerHeader, providerId)
    .set('idempotency-key', key)
    .send(body) as Promise<SupertestResponse>

describe('Security / authorization', () => {
  let app: INestApplication
  let server: Server

  beforeAll(async () => {
    app = await createSecureApp()
    server = app.getHttpServer()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('caller identity', () => {
    it('resolves the caller from the X-Provider-Id header over the body providerId', async () => {
      const { id, playerId } = await openWallet(server, '100.00')
      const external = `identity-${unique()}`
      const body = {
        providerId: 'provider-a',
        externalTransactionId: external,
        playerId,
        walletId: id,
        roundId: `round-${unique()}`,
        gameId: 'fortune-tiger',
        kind: 'BET',
        money: { amount: '10.00', currency: 'BRL' },
      }

      const response = await submitBet(server, body, 'provider-b', `security:identity-${unique()}`)

      expect(response.status).toBe(200)
      expect(response.body.transactionId).toBeDefined()

      const byHeaderProvider = await request(server)
        .get(`/providers/provider-b/wagering/transactions/${external}`)
        .set(providerHeader, 'provider-b')
        .expect(200)

      expect(byHeaderProvider.body.providerId).toBe('provider-b')

      await request(server)
        .get(`/providers/provider-a/wagering/transactions/${external}`)
        .set(providerHeader, 'provider-a')
        .expect(404)
    })

    it('records the wager under the provider of the caller', async () => {
      const { id, playerId } = await openWallet(server, '100.00')
      const external = `caller-${unique()}`
      const body = {
        providerId: 'provider-c',
        externalTransactionId: external,
        playerId,
        walletId: id,
        roundId: `round-${unique()}`,
        gameId: 'fortune-tiger',
        kind: 'BET',
        money: { amount: '10.00', currency: 'BRL' },
      }

      const submitted = await submitBet(server, body, 'provider-a', `security:caller-${unique()}`)

      expect(submitted.status).toBe(200)

      const read = await request(server)
        .get(`/wagering/transactions/${submitted.body.transactionId}`)
        .set(providerHeader, 'provider-a')
        .expect(200)

      expect(read.body.providerId).toBe('provider-a')
    })
  })

  describe('wager reads are keyed by the identifiers presented', () => {
    it('answers 404 for a transactionId that was never recorded', async () => {
      await request(server)
        .get(`/wagering/transactions/${'00000000-0000-7000-0000-000000000001'}`)
        .set(providerHeader, 'provider-a')
        .expect(404)
    })

    it('answers 404 for a provider pair that was never recorded', async () => {
      await request(server)
        .get(`/providers/provider-a/wagering/transactions/pair-never-recorded-${unique()}`)
        .set(providerHeader, 'provider-a')
        .expect(404)
    })
  })

  describe('wager audit scope', () => {
    it('answers 404 for a journey and audit of a wager of another provider', async () => {
      const { id, playerId } = await openWallet(server, '100.00')
      const external = `scoped-${unique()}`
      const body = {
        providerId: 'provider-a',
        externalTransactionId: external,
        playerId,
        walletId: id,
        roundId: `round-${unique()}`,
        gameId: 'fortune-tiger',
        kind: 'BET',
        money: { amount: '10.00', currency: 'BRL' },
      }

      const submitted = await submitBet(server, body, 'provider-a', `security:scoped-${unique()}`)

      expect(submitted.status).toBe(200)

      await request(server)
        .get(`/wagering/transactions/${submitted.body.transactionId}/audit`)
        .set(providerHeader, 'provider-b')
        .expect(404)

      await request(server)
        .get(`/wagering/transactions/${submitted.body.transactionId}/journey`)
        .set(providerHeader, 'provider-b')
        .expect(404)

      const ownerAudit = await request(server)
        .get(`/wagering/transactions/${submitted.body.transactionId}/audit`)
        .set(providerHeader, 'provider-a')
        .expect(200)

      expect(Array.isArray(ownerAudit.body.items)).toBe(true)

      const ownerJourney = await request(server)
        .get(`/wagering/transactions/${submitted.body.transactionId}/journey`)
        .set(providerHeader, 'provider-a')
        .expect(200)

      expect(Array.isArray(ownerJourney.body.items)).toBe(true)
    })
  })

  describe('player journey scope', () => {
    it('answers 404 for the player journey of another provider', async () => {
      const { playerId } = await openWallet(server, '100.00')
      await request(server)
        .get(`/providers/provider-a/players/${playerId}/journey`)
        .set(providerHeader, 'provider-b')
        .expect(404)

      const own = await request(server)
        .get(`/providers/provider-b/players/${playerId}/journey`)
        .set(providerHeader, 'provider-b')
        .expect(200)

      expect(Array.isArray(own.body.items)).toBe(true)
    })
  })
})
