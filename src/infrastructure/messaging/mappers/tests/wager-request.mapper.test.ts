import { describe, expect, test } from 'bun:test'
import { WagerTransactionKind } from '@domain/wager/enums'
import { WagerRequest } from '../../messages'
import { WagerRequestMapper } from '../wager-request.mapper'

const identity = {
  messageId: 'msg-123',
  providerId: 'provider-a',
  externalTransactionId: 'transaction-1',
  playerId: 'player-1',
  walletId: 'wallet-1',
  roundId: 'round-1',
  gameId: 'game-1',
  idempotencyKey: 'provider-a:transaction-1',
  consumerName: 'wager-transactions',
}

const instant = {
  occurredAt: '2026-07-29T15:00:00.000Z',
  receivedAt: new Date('2026-07-29T15:00:01.000Z'),
}

const money = {
  amount: '10.00',
  currency: 'BRL',
}

const body = JSON.stringify({
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
    kind: WagerTransactionKind.BET,
    money,
  },
})

describe('WagerRequestMapper', () => {
  test('WHEN the request is valid SHOULD map it to the use case input', () => {
    const request = WagerRequest.from({ body })

    if (request === null) { throw new Error('Expected a request') }

    const output = new WagerRequestMapper().map({
      request,
      receivedAt: instant.receivedAt,
      consumerName: identity.consumerName,
    })

    expect(output.providerId).toBe(identity.providerId)
    expect(output.externalTransactionId).toBe(identity.externalTransactionId)
    expect(output.playerId).toBe(identity.playerId)
    expect(output.walletId).toBe(identity.walletId)
    expect(output.roundId).toBe(identity.roundId)
    expect(output.gameId).toBe(identity.gameId)
    expect(output.idempotencyKey).toBe(identity.idempotencyKey)
    expect(output.kind).toBe(WagerTransactionKind.BET)
    expect(output.money.toJSON()).toEqual(money)
    expect(output.at).toEqual(new Date(instant.occurredAt))
    expect(output.inbox).toEqual({
      messageId: identity.messageId,
      consumerName: identity.consumerName,
      receivedAt: instant.receivedAt,
    })
  })
})
