import { describe, expect, test } from 'bun:test'
import { Theory } from '@infrastructure/protocols'
import { Money } from '@domain/money/money'
import { FailureCode, WagerTransactionKind, WagerTransactionStatus } from '@domain/wager/enums'
import { WagerType } from '@domain/wager/types'
import { WagerTransaction } from '@domain/wager/wager'
import { IdempotencyOutcome } from '../enums'
import { IdempotencyService } from '../services'
import { IdempotencyType } from '../types'

interface IdempotencyTheory<TParams> extends Theory<TParams> {
  title: string
  description: string
}

type Payload = IdempotencyType.Payload
type Schema = WagerType.Input
type Stored = IdempotencyType.Stored

const currency = {
  brl: 'BRL',
}

const amount = {
  ten: '10.00',
  eleven: '11.00',
}

const identity = {
  wager: 'wager-id',
  provider: 'provider-a',
  external: 'transaction-123',
  key: 'provider-a:transaction-123',
  wallet: 'wallet-id',
  player: 'player-id',
  round: 'round-id',
  game: 'game-id',
}

const instant = {
  created: new Date('2026-01-01T00:00:00.000Z'),
  processed: new Date('2026-01-01T00:00:01.000Z'),
}

const observed = {
  balance: '90.00',
}

const service = new IdempotencyService()

class IdempotencyProbe {
  static money(value: string): Money {
    return Money.from({ amount: value, currency: currency.brl })
  }

  static payload(referenceExternal: string | undefined): Payload {
    return {
      providerId: identity.provider,
      externalTransactionId: identity.external,
      playerId: identity.player,
      walletId: identity.wallet,
      roundId: identity.round,
      gameId: identity.game,
      kind: WagerTransactionKind.BET,
      money: IdempotencyProbe.money(amount.ten),
      referenceExternalTransactionId: referenceExternal,
    }
  }

  static open(hash: string): WagerTransaction {
    const input: Schema = {
      id: identity.wager,
      providerId: identity.provider,
      externalTransactionId: identity.external,
      idempotencyKey: identity.key,
      payloadHash: hash,
      walletId: identity.wallet,
      playerId: identity.player,
      roundId: identity.round,
      gameId: identity.game,
      kind: WagerTransactionKind.BET,
      money: IdempotencyProbe.money(amount.ten),
      referenceExternalTransactionId: undefined,
      createdAt: instant.created,
    }

    return WagerTransaction.create(input)
  }

  static close(hash: string, status: WagerTransactionStatus, code: FailureCode | undefined): WagerTransaction {
    const wager = IdempotencyProbe.open(hash)
    const processed = status === WagerTransactionStatus.PROCESSED

    if (processed) {
      wager.markProcessed(undefined, instant.processed)

      return wager
    }

    if (code === undefined) { return wager }

    wager.reject(code)

    return wager
  }
}

describe('IdempotencyService', () => {
  describe('fresh', () => {
    type Params = { key: string }

    const theories: IdempotencyTheory<Params>[] = [
      {
        title: 'empty store',
        description: 'WHEN no wager is stored SHOULD return fresh',
        params: { key: identity.key },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: IdempotencyTheory<Params>) => {
      const hash = service.hash(IdempotencyProbe.payload(undefined))
      const output = service.outcome({ key: params.key, hash, stored: undefined })
      const fresh = output.outcome === IdempotencyOutcome.FRESH

      expect(fresh).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('replay', () => {
    type Params = {
      status: WagerTransactionStatus
      failureCode: FailureCode | undefined
      balance: string
    }

    const theories: IdempotencyTheory<Params>[] = [
      {
        title: 'processed wager',
        description: 'WHEN the hash matches SHOULD replay the observed balance',
        params: {
          status: WagerTransactionStatus.PROCESSED,
          failureCode: undefined,
          balance: observed.balance,
        },
        expected: true,
      },
      {
        title: 'rejected wager',
        description: 'WHEN the wager was rejected SHOULD replay that failure code',
        params: {
          status: WagerTransactionStatus.REJECTED,
          failureCode: FailureCode.INSUFFICIENT_FUNDS,
          balance: observed.balance,
        },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: IdempotencyTheory<Params>) => {
      const hash = service.hash(IdempotencyProbe.payload(undefined))
      const wager = IdempotencyProbe.close(hash, params.status, params.failureCode)
      const stored: Stored = { wager, observedBalance: params.balance }
      const output = service.outcome({ key: identity.key, hash, stored })
      const replay = output.outcome === IdempotencyOutcome.REPLAY
      const record = replay ? output : undefined
      const aligned = record !== undefined
        && record.transactionId === identity.wager
        && record.status === params.status
        && record.balance === params.balance
        && record.failureCode === params.failureCode
        && record.idempotentReplay

      expect(aligned).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('conflict', () => {
    type Params = { amount: string }

    const theories: IdempotencyTheory<Params>[] = [
      {
        title: 'other amount',
        description: 'WHEN the hash differs SHOULD return a payload conflict',
        params: { amount: amount.eleven },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: IdempotencyTheory<Params>) => {
      const payload = IdempotencyProbe.payload(undefined)
      const hash = service.hash(payload)
      const wager = IdempotencyProbe.close(hash, WagerTransactionStatus.PROCESSED, undefined)
      const stored: Stored = { wager, observedBalance: observed.balance }
      const money = IdempotencyProbe.money(params.amount)
      const other = { ...payload, money }
      const otherHash = service.hash(other)
      const output = service.outcome({ key: identity.key, hash: otherHash, stored })
      const conflict = output.outcome === IdempotencyOutcome.CONFLICT
      const record = conflict ? output : undefined
      const aligned = record !== undefined
        && record.failureCode === FailureCode.IDEMPOTENCY_PAYLOAD_CONFLICT

      expect(aligned).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })
})
