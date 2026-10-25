import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AuditChannel } from '../../../../test/audit-channel.e2e'
import { createApp } from '../../../../test/test-setup.e2e'

const providerHeader = 'x-provider-id'
const idempotencyHeader = 'idempotency-key'
const owner = 'audit-provider-a'
const foreign = 'audit-provider-b'
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
  const externalTransactionId = `audit-external-${stamp}`
  const idempotencyKey = `${owner}:${externalTransactionId}`
  const body = {
    providerId: owner,
    externalTransactionId,
    playerId,
    walletId,
    roundId: `audit-round-${stamp}`,
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

  return { transactionId: response.body.transactionId as string, idempotencyKey }
}

const audit = (app: INestApplication, transactionId: string, provider = owner, query = '') =>
  request(app.getHttpServer())
    .get(`/wagering/transactions/${transactionId}/audit${query}`)
    .set(providerHeader, provider)

const timeline = async (
  app: INestApplication,
  transactionId: string,
  query = '',
): Promise<Array<Record<string, unknown>>> => {
  const response = await audit(app, transactionId, owner, query).expect(200)

  return response.body.items
}

const waitForTimeline = async (app: INestApplication, transactionId: string): Promise<Array<Record<string, unknown>>> => {
  const expiresAt = deadline()

  while (Date.now() < expiresAt) {
    const items = await timeline(app, transactionId)

    if (items.length >= 2) { return items }

    await pause(pollInterval)
  }

  return []
}

describe('Wager audit timeline (e2e)', () => {
  let app: INestApplication
  let channel: AuditChannel
  let transactionId: string
  let idempotencyKey: string

  beforeAll(async () => {
    channel = await AuditChannel.open()
    app = await createApp()

    const playerId = `audit-player-${Date.now()}`
    const walletId = await openWallet(app, playerId)
    const submitted = await submit(app, walletId, playerId)

    transactionId = submitted.transactionId
    idempotencyKey = submitted.idempotencyKey
  }, hookTimeout)

  it('should answer the recorded lifecycle in event order', async () => {
    const items = await waitForTimeline(app, transactionId)
    const types = items.map((item) => item.eventType)

    expect(types).toContain('WagerTransactionProcessed')
    expect(types).toContain('WalletBalanceChanged')
    expect(items.every((item) => item.wagerId === transactionId)).toBe(true)
    expect(items.every((item) => item.correlationId === idempotencyKey)).toBe(true)
    expect(items.every((item) => item.source === 'fortune-tiger')).toBe(true)

    const processed = items.find((item) => item.eventType === 'WagerTransactionProcessed')
    const metadata = processed?.metadata as Record<string, string> | undefined
    const actor = processed?.actor as Record<string, string> | undefined

    expect(metadata).toEqual({ status: 'PROCESSED', kind: 'BET' })
    expect(actor).toEqual({ type: 'provider', id: owner })
  }, pollTimeout)

  it('should filter by event type', async () => {
    const items = await timeline(app, transactionId, '?eventType=WalletBalanceChanged')

    expect(items).toHaveLength(1)
    expect(items[0]?.eventType).toBe('WalletBalanceChanged')
  })

  it('should cap the page by limit', async () => {
    const items = await timeline(app, transactionId, '?limit=1')

    expect(items).toHaveLength(1)
  })

  it('should refuse an invalid limit', async () => {
    await audit(app, transactionId, owner, '?limit=0').expect(400)
  })

  it('should refuse an invalid time bound', async () => {
    await audit(app, transactionId, owner, '?from=not-a-date').expect(400)
  })

  it('should hide a wager of another provider', async () => {
    await audit(app, transactionId, foreign).expect(404)
  })

  it('should answer 404 for an unknown wager', async () => {
    const unknown = '0190f0f0-0000-7000-8000-000000000000'

    await audit(app, unknown).expect(404)
  })

  afterAll(async () => {
    await app.close()
    await channel.close()
  }, hookTimeout)
})
