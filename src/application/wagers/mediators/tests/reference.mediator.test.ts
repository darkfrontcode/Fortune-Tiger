import { describe, expect, test } from 'bun:test'
import { Money } from '@domain/money/money'
import { Wallet } from '@domain/wallet/wallet'
import {
  FailureCode,
  WagerTransactionKind,
  WagerTransactionStatus,
} from '@domain/wager/enums'
import { WagerType } from '@domain/wager/types'
import { WagerTransaction } from '@domain/wager/wager'
import { WagersType } from '../../types'
import { ReferenceMediator } from '../reference.mediator'
import { WagerMediator } from '../wager.mediator'

type Schema = WagerType.Schema
type Input = WagerType.Input
type Mediation = WagersType.Mediation

const currency = {
  brl: 'BRL',
}

const amount = {
  ten: '10.00',
  hundred: '100.00',
  hundredTen: '110.00',
}

const identity = {
  wager: 'wager-id',
  referenceWager: 'reference-wager-id',
  provider: 'provider-id',
  external: 'external-id',
  referenceExternal: 'reference-external-id',
  key: 'idempotency-key',
  hash: 'payload-hash',
  wallet: 'wallet-id',
  player: 'player-id',
  round: 'round-id',
  game: 'game-id',
  ledger: 'ledger-id',
}

const instant = {
  created: new Date('2026-01-01T00:00:00.000Z'),
  move: new Date('2026-01-01T00:00:01.000Z'),
  retry: new Date('2026-01-01T00:00:02.000Z'),
}

const retry = {
  firstDelayMs: 1_000,
  attempts: 11,
  limit: 12,
}

class ReferenceProbe {
  static money(value: string): Money {
    return Money.from({ amount: value, currency: currency.brl })
  }

  static wallet(): Wallet {
    const balance = ReferenceProbe.money(amount.hundred)
    const input = {
      id: identity.wallet,
      playerId: identity.player,
      balance,
      openedAt: instant.created,
    }

    return Wallet.open(input)
  }

  static open(
    kind: WagerTransactionKind,
    referenceExternal: string | undefined,
    id = identity.wager,
    external = identity.external,
  ): WagerTransaction {
    const money = ReferenceProbe.money(amount.ten)
    const input: Input = {
      id,
      providerId: identity.provider,
      externalTransactionId: external,
      idempotencyKey: identity.key,
      payloadHash: identity.hash,
      walletId: identity.wallet,
      playerId: identity.player,
      roundId: identity.round,
      gameId: identity.game,
      kind,
      money,
      referenceExternalTransactionId: referenceExternal,
      createdAt: instant.created,
    }

    return WagerTransaction.create(input)
  }

  static waiting(attempts: number): WagerTransaction {
    const money = ReferenceProbe.money(amount.ten)
    const schema: Schema = {
      id: identity.wager,
      providerId: identity.provider,
      externalTransactionId: identity.external,
      idempotencyKey: identity.key,
      payloadHash: identity.hash,
      walletId: identity.wallet,
      playerId: identity.player,
      roundId: identity.round,
      gameId: identity.game,
      kind: WagerTransactionKind.REFUND,
      money,
      referenceExternalTransactionId: identity.referenceExternal,
      createdAt: instant.created,
      status: WagerTransactionStatus.PENDING_REFERENCE,
      referenceTransactionId: undefined,
      failureCode: undefined,
      processedAt: undefined,
      attempts,
      nextAttemptAt: instant.move,
    }

    return WagerTransaction.rehydrate(schema)
  }

  static reference(status: WagerTransactionStatus): WagerTransaction {
    const reference = ReferenceProbe.open(
      WagerTransactionKind.BET,
      undefined,
      identity.referenceWager,
      identity.referenceExternal,
    )

    if (status === WagerTransactionStatus.PROCESSED) {
      reference.markProcessed(undefined, instant.move)
    }

    if (status === WagerTransactionStatus.REJECTED) {
      reference.reject(FailureCode.INSUFFICIENT_FUNDS)
    }

    return reference
  }

  static mediation(reference: WagerTransaction | undefined): Mediation {
    return {
      wallet: ReferenceProbe.wallet(),
      reference,
      reversed: false,
      ledgerId: identity.ledger,
      at: instant.retry,
    }
  }
}

describe('ReferenceMediator', () => {
  const mediator = new ReferenceMediator(new WagerMediator())

  test('WHEN the reference is missing SHOULD schedule the first retry', () => {
    const wager = ReferenceProbe.waiting(0)
    const mediation = ReferenceProbe.mediation(undefined)
    const ledger = mediator.retry(wager, mediation)
    const waiting = wager.status === WagerTransactionStatus.PENDING_REFERENCE
    const counted = wager.attempts === 1
    const scheduled = wager.nextAttemptAt?.getTime() === instant.retry.getTime() + retry.firstDelayMs
    const empty = ledger === undefined

    expect(waiting && counted && scheduled && empty).toBe(true)
  })

  test('WHEN the reference is still pending SHOULD schedule another retry', () => {
    const wager = ReferenceProbe.waiting(0)
    const reference = ReferenceProbe.reference(WagerTransactionStatus.PENDING)
    const mediation = ReferenceProbe.mediation(reference)
    const ledger = mediator.retry(wager, mediation)
    const waiting = wager.status === WagerTransactionStatus.PENDING_REFERENCE
    const counted = wager.attempts === 1
    const empty = ledger === undefined

    expect(waiting && counted && empty).toBe(true)
  })

  test('WHEN the reference is terminal SHOULD process the wager', () => {
    const wager = ReferenceProbe.waiting(0)
    const reference = ReferenceProbe.reference(WagerTransactionStatus.PROCESSED)
    const mediation = ReferenceProbe.mediation(reference)
    const ledger = mediator.retry(wager, mediation)
    const processed = wager.status === WagerTransactionStatus.PROCESSED
    const balance = mediation.wallet.balance.amount === amount.hundredTen
    const linked = wager.referenceTransactionId === reference.id
    const stored = ledger !== undefined

    expect(processed && balance && linked && stored).toBe(true)
  })

  test('WHEN the reference was rejected SHOULD reject the wager', () => {
    const wager = ReferenceProbe.waiting(0)
    const reference = ReferenceProbe.reference(WagerTransactionStatus.REJECTED)
    const mediation = ReferenceProbe.mediation(reference)
    const ledger = mediator.retry(wager, mediation)
    const rejected = wager.status === WagerTransactionStatus.REJECTED
    const coded = wager.failureCode === FailureCode.REFERENCE_NOT_FOUND
    const empty = ledger === undefined

    expect(rejected && coded && empty).toBe(true)
  })

  test('WHEN the attempts are exhausted SHOULD reject with reference not found', () => {
    const wager = ReferenceProbe.waiting(retry.attempts)
    const mediation = ReferenceProbe.mediation(undefined)
    const ledger = mediator.retry(wager, mediation)
    const rejected = wager.status === WagerTransactionStatus.REJECTED
    const coded = wager.failureCode === FailureCode.REFERENCE_NOT_FOUND
    const counted = wager.attempts === retry.limit
    const cleared = wager.nextAttemptAt === undefined
    const empty = ledger === undefined

    expect(rejected && coded && counted && cleared && empty).toBe(true)
  })
})
