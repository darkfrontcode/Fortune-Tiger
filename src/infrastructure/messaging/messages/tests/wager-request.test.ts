import { describe, expect, test } from 'bun:test'
import { WagerTransactionKind } from '@domain/wager/enums'
import { WagerRequest } from '../wager-request'

const identity = {
  messageId: 'msg-123',
  providerId: 'provider-a',
  externalTransactionId: 'transaction-1',
  playerId: 'player-1',
  walletId: 'wallet-1',
  roundId: 'round-1',
  gameId: 'game-1',
  idempotencyKey: 'provider-a:transaction-1',
}

const instant = {
  occurredAt: '2026-07-29T15:00:00.000Z',
}

const money = {
  amount: '10.00',
  currency: 'BRL',
}

const body = (value: unknown): string => JSON.stringify(value)

type Changes = {
  kind?: unknown
  money?: unknown
  referenceExternalTransactionId?: string
}

const request = (kind: WagerTransactionKind, changes: Changes = {}) => ({
  messageId: identity.messageId,
  type: 'WagerTransactionRequested',
  occurredAt: instant.occurredAt,
  data: {
    providerId: identity.providerId,
    externalTransactionId: identity.externalTransactionId,
    playerId: identity.playerId,
    walletId: identity.walletId,
    roundId: identity.roundId,
    gameId: identity.gameId,
    idempotencyKey: identity.idempotencyKey,
    kind,
    money,
    ...changes,
  },
})

const input = (value: unknown) => ({ body: body(value) })

describe('WagerRequest', () => {
  test('WHEN the message is a request SHOULD build it', () => {
    const output = WagerRequest.from(input(request(WagerTransactionKind.BET)))

    if (output === null) { throw new Error('Expected a request') }

    expect(output.messageId).toBe(identity.messageId)
    expect(output.occurredAt).toEqual(new Date(instant.occurredAt))
    expect(output.data.providerId).toBe(identity.providerId)
    expect(output.data.externalTransactionId).toBe(identity.externalTransactionId)
    expect(output.data.playerId).toBe(identity.playerId)
    expect(output.data.walletId).toBe(identity.walletId)
    expect(output.data.roundId).toBe(identity.roundId)
    expect(output.data.gameId).toBe(identity.gameId)
    expect(output.data.idempotencyKey).toBe(identity.idempotencyKey)
    expect(output.data.kind).toBe(WagerTransactionKind.BET)
    expect(output.data.money.toJSON()).toEqual(money)
  })

  test('WHEN the message is an integration event SHOULD ignore it', () => {
    const event = { eventType: 'WagerTransactionProcessed', messageId: identity.messageId }

    expect(WagerRequest.from(input(event))).toBeNull()
  })

  test('WHEN the body is not JSON SHOULD reject the request', () => {
    expect(() => WagerRequest.from({ body: '{' })).toThrow()
  })

  test('WHEN the kind is unknown SHOULD reject the request', () => {
    const message = request(WagerTransactionKind.BET, { kind: 'UNKNOWN' })

    expect(() => WagerRequest.from(input(message))).toThrow()
  })

  test('WHEN a refund has no reference SHOULD reject the request', () => {
    const message = request(WagerTransactionKind.REFUND)

    expect(() => WagerRequest.from(input(message))).toThrow()
  })

  test('WHEN a refund has a reference SHOULD build it', () => {
    const message = request(WagerTransactionKind.REFUND, { referenceExternalTransactionId: 'transaction-0' })
    const output = WagerRequest.from(input(message))

    if (output === null) { throw new Error('Expected a request') }

    expect(output.data.referenceExternalTransactionId).toBe('transaction-0')
  })

  test('WHEN the money is invalid SHOULD reject the request', () => {
    const message = request(WagerTransactionKind.BET, { money: { amount: '10.001', currency: 'BRL' } })

    expect(() => WagerRequest.from(input(message))).toThrow()
  })
})
