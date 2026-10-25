import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createApp } from '../../../../test/test-setup.e2e'

const providerHeader = 'x-provider-id'
const idempotencyHeader = 'idempotency-key'
const owner = 'journey-provider-a'
const foreign = 'journey-provider-b'
const pollInterval = 500
const pollTimeout = 30_000
const hookTimeout = 60_000

const pause = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

const deadline = (): number => Date.now() + pollTimeout

const openWallet = async (app: INestApplication, playerId: string): Promise<string> => {
  const response = await request(app.getHttpServer())
    .post('/wallets')
    .send({ playerId, initialBalance: { amount: '500.00', currency: 'BRL' } })
    .expect(201)

  return response.body.id
}

const submit = async (app: INestApplication, walletId: string, playerId: string) => {
  const stamp = Date.now()
  const externalTransactionId = `journey-external-${stamp}`
  const idempotencyKey = `${owner}:${externalTransactionId}`
  const body = {
    providerId: owner,
    externalTransactionId,
    playerId,
    walletId,
    roundId: `journey-round-${stamp}`,
    gameId: 'fortune-tiger',
    kind: 'BET',
    money: { amount: '10.00', currency: 'BRL' },
  }

  const response = await request(app.getHttpServer())
    .post('/wagering/transactions')
    .set(providerHeader, owner)
    .set(idempotencyHeader, idempotencyKey)
    .send(body)
    .expect([200, 201])

  return { transactionId: response.body.transactionId as string, idempotencyKey, playerId }
}

const journey = (
  app: INestApplication,
  transactionId: string,
  provider = owner,
  query = '',
) =>
  request(app.getHttpServer())
    .get(`/wagering/transactions/${transactionId}/journey${query}`)
    .set(providerHeader, provider)

const playerJourney = (
  app: INestApplication,
  playerId: string,
  provider = owner,
  query = '',
) =>
  request(app.getHttpServer())
    .get(`/providers/${provider}/players/${playerId}/journey${query}`)
    .set(providerHeader, provider)

const waitForSteps = async (
  app: INestApplication,
  playerId: string,
): Promise<Array<Record<string, unknown>>> => {
  const expiresAt = deadline()

  while (Date.now() < expiresAt) {
    const response = await playerJourney(app, playerId, owner).expect(200)
    const items = response.body.items as Array<Record<string, unknown>>

    if (items.length >= 2) { return items }

    await pause(pollInterval)
  }

  return []
}

describe('Wager journey timeline (e2e)', () => {
  let app: INestApplication
  let transactionId: string
  let playerId: string

  beforeAll(async () => {
    app = await createApp()

    const stamp = Date.now()
    const walletId = await openWallet(app, `journey-owner-${stamp}`)
    const submitted = await submit(app, walletId, `journey-owner-${stamp}`)

    transactionId = submitted.transactionId
    playerId = `journey-owner-${stamp}`
  }, hookTimeout)

  it('should answer the recorded steps in order', async () => {
    const response = await journey(app, transactionId).expect(200)
    const items = response.body.items as Array<Record<string, unknown>>

    expect(items.length).toBeGreaterThanOrEqual(1)
    expect(items.every((item) => String(item.flowId).startsWith(`${owner}:`))).toBe(true)
    expect(items.every((item) => item.wagerId === transactionId)).toBe(true)
  }, pollTimeout)

  it('should refuse an invalid limit', async () => {
    await journey(app, transactionId, owner, '?limit=0').expect(400)
  })

  it('should refuse an invalid stage', async () => {
    await journey(app, transactionId, owner, '?stage=done').expect(400)
  })

  it('should hide a wager of another provider', async () => {
    await journey(app, transactionId, foreign).expect(404)
  })

  it('should answer 404 for an unknown wager', async () => {
    const unknown = '0190f0f0-0000-7000-8000-000000000000'

    await journey(app, unknown).expect(404)
  })

  it('should expose the player journey to its provider', async () => {
    const items = await waitForSteps(app, playerId)

    expect(items.length).toBeGreaterThanOrEqual(1)
    expect(items.every((item) => item.playerId === playerId)).toBe(true)
    expect(items.every((item) => item.providerId === owner)).toBe(true)
  }, pollTimeout)

  it('should answer 404 for another provider player journey', async () => {
    await playerJourney(app, playerId, foreign, undefined).set(providerHeader, owner).expect(404)
  })

  it('should answer an empty page for an unknown player journey', async () => {
    const unknown = '0190f0f0-0000-7000-8000-000000000000'
    const response = await playerJourney(app, unknown).expect(200)

    expect(response.body.items).toEqual([])
  })

  afterAll(async () => {
    await app.close()
  }, hookTimeout)
})
