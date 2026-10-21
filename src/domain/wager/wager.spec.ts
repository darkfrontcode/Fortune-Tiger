import { describe, expect, test } from 'bun:test'
import { TheoryProtocol } from '../../infrastructure/protocols'
import { Money } from '../money/money'
import {
  REFERENCE_REQUIRED_MESSAGE,
  STATUS_TRANSITION_MESSAGE,
  TERMINAL_STATUS_MESSAGE,
} from './data'
import { FailureCode, WagerTransactionKind, WagerTransactionStatus } from './enums'
import { WagerType } from './types'
import { WagerTransaction } from './wager'

interface WagerTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

type Schema = WagerType.Schema
type Input = WagerType.Input

const currency = {
  brl: 'BRL',
}

const amount = {
  ten: '10.00',
}

const identity = {
  wager: 'wager-id',
  provider: 'provider-id',
  external: 'external-id',
  key: 'idempotency-key',
  hash: 'payload-hash',
  wallet: 'wallet-id',
  player: 'player-id',
  round: 'round-id',
  game: 'game-id',
  reference: 'reference-id',
  linked: 'linked-id',
}

const instant = {
  created: new Date('2026-01-01T00:00:00.000Z'),
  processed: new Date('2026-01-01T00:00:01.000Z'),
}

const blank = String()

const catalog = [
  FailureCode.INSUFFICIENT_FUNDS,
  FailureCode.REVERSAL_INSUFFICIENT_FUNDS,
  FailureCode.CURRENCY_MISMATCH,
  FailureCode.WALLET_NOT_FOUND,
  FailureCode.PLAYER_WALLET_MISMATCH,
  FailureCode.INVALID_KIND,
  FailureCode.INVALID_REFERENCE_KIND,
  FailureCode.REFERENCE_NOT_FOUND,
  FailureCode.REFERENCE_ALREADY_REVERSED,
  FailureCode.REFERENCE_AMOUNT_MISMATCH,
  FailureCode.REFERENCE_SCOPE_MISMATCH,
  FailureCode.IDEMPOTENCY_PAYLOAD_CONFLICT,
  FailureCode.OPENING_NOT_ALLOWED,
  FailureCode.NEGATIVE_AMOUNT,
  FailureCode.INVALID_MONEY,
]

class WagerProbe {
  static message(read: () => void): string {
    try {
      read()

      return blank
    } catch (error) {
      const thrown = error instanceof Error

      if (!thrown) { return blank }

      return error.message
    }
  }

  static money(): Money {
    return Money.from({ amount: amount.ten, currency: currency.brl })
  }

  static open(kind: WagerTransactionKind, reference: string | undefined): WagerTransaction {
    const money = WagerProbe.money()
    const input: Input = {
      id: identity.wager,
      providerId: identity.provider,
      externalTransactionId: identity.external,
      idempotencyKey: identity.key,
      payloadHash: identity.hash,
      walletId: identity.wallet,
      playerId: identity.player,
      roundId: identity.round,
      gameId: identity.game,
      kind,
      money,
      referenceExternalTransactionId: reference,
      createdAt: instant.created,
    }

    return WagerTransaction.create(input)
  }

  static stored(
    kind: WagerTransactionKind,
    status: WagerTransactionStatus,
    reference: string | undefined,
    failureCode: FailureCode | undefined,
  ): WagerTransaction {
    const money = WagerProbe.money()
    const processed = status === WagerTransactionStatus.PROCESSED
    const processedAt = processed ? instant.processed : undefined
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
      kind,
      money,
      referenceExternalTransactionId: reference,
      createdAt: instant.created,
      status,
      referenceTransactionId: undefined,
      failureCode,
      processedAt,
    }

    return WagerTransaction.rehydrate(schema)
  }
}

describe('WagerTransaction', () => {
  describe('create', () => {
    type Params = {
      kind: WagerTransactionKind
      reference: string | undefined
      required: boolean
    }

    const theories: WagerTheory<Params>[] = [
      {
        title: 'opening',
        description: 'WHEN opening is created SHOULD start pending without a reference',
        params: {
          kind: WagerTransactionKind.OPENING,
          reference: undefined,
          required: false,
        },
        expected: true,
      },
      {
        title: 'bet',
        description: 'WHEN a bet is created SHOULD start pending without a reference',
        params: {
          kind: WagerTransactionKind.BET,
          reference: undefined,
          required: false,
        },
        expected: true,
      },
      {
        title: 'win',
        description: 'WHEN a win is created SHOULD start pending without a reference',
        params: {
          kind: WagerTransactionKind.WIN,
          reference: undefined,
          required: false,
        },
        expected: true,
      },
      {
        title: 'loss',
        description: 'WHEN a loss is created SHOULD start pending without a reference',
        params: {
          kind: WagerTransactionKind.LOSS,
          reference: undefined,
          required: false,
        },
        expected: true,
      },
      {
        title: 'refund',
        description: 'WHEN a refund is created with a reference SHOULD start pending',
        params: {
          kind: WagerTransactionKind.REFUND,
          reference: identity.reference,
          required: true,
        },
        expected: true,
      },
      {
        title: 'rollback',
        description: 'WHEN a rollback is created with a reference SHOULD start pending',
        params: {
          kind: WagerTransactionKind.ROLLBACK,
          reference: identity.reference,
          required: true,
        },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WagerTheory<Params>) => {
      const wager = WagerProbe.open(params.kind, params.reference)
      const pending = wager.status === WagerTransactionStatus.PENDING
      const coded = wager.failureCode === undefined
      const stamped = wager.processedAt === undefined
      const linked = wager.referenceTransactionId === undefined
      const required = wager.requiresReference() === params.required
      const terminal = wager.isTerminal()
      const kept = pending && coded && stamped && linked && required && !terminal

      expect(kept).toBe(expected)
      expect(wager.kind).toBe(params.kind)
      expect(wager.referenceExternalTransactionId).toBe(params.reference)
      expect(wager.idempotencyKey).toBe(identity.key)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('create without a reference', () => {
    type Params = { kind: WagerTransactionKind; reference: string | undefined }

    const theories: WagerTheory<Params>[] = [
      {
        title: 'refund without a reference',
        description: 'WHEN a refund has no reference SHOULD throw',
        params: { kind: WagerTransactionKind.REFUND, reference: undefined },
        expected: true,
      },
      {
        title: 'refund with a blank reference',
        description: 'WHEN a refund reference is blank SHOULD throw',
        params: { kind: WagerTransactionKind.REFUND, reference: blank },
        expected: true,
      },
      {
        title: 'rollback without a reference',
        description: 'WHEN a rollback has no reference SHOULD throw',
        params: { kind: WagerTransactionKind.ROLLBACK, reference: undefined },
        expected: true,
      },
      {
        title: 'rollback with a blank reference',
        description: 'WHEN a rollback reference is blank SHOULD throw',
        params: { kind: WagerTransactionKind.ROLLBACK, reference: blank },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WagerTheory<Params>) => {
      const read = () => WagerProbe.open(params.kind, params.reference)
      const message = WagerProbe.message(read)
      const refused = message === REFERENCE_REQUIRED_MESSAGE

      expect(refused).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('mark processed', () => {
    type Params = { reference: string | undefined }

    const theories: WagerTheory<Params>[] = [
      {
        title: 'linked bet',
        description: 'WHEN pending is processed SHOULD become terminal and keep the link',
        params: { reference: identity.linked },
        expected: true,
      },
      {
        title: 'loss without a link',
        description: 'WHEN pending is processed without a link SHOULD stay without a failure code',
        params: { reference: undefined },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WagerTheory<Params>) => {
      const wager = WagerProbe.open(WagerTransactionKind.BET, undefined)

      wager.markProcessed(params.reference, instant.processed)

      const processed = wager.status === WagerTransactionStatus.PROCESSED
      const terminal = wager.isTerminal()
      const linked = wager.referenceTransactionId === params.reference
      const coded = wager.failureCode === undefined
      const stamped = wager.processedAt?.getTime() === instant.processed.getTime()
      const kept = processed && terminal && linked && coded && stamped

      expect(kept).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('mark pending reference', () => {
    const theories: WagerTheory<undefined>[] = [
      {
        title: 'missing reference',
        description: 'WHEN pending waits for a reference SHOULD leave the terminal statuses',
        params: undefined,
        expected: true,
      },
    ]

    const prove = ({ expected }: WagerTheory<undefined>) => {
      const wager = WagerProbe.open(WagerTransactionKind.REFUND, identity.reference)

      wager.markPendingReference()

      const waiting = wager.status === WagerTransactionStatus.PENDING_REFERENCE
      const terminal = wager.isTerminal()
      const coded = wager.failureCode === undefined
      const stamped = wager.processedAt === undefined
      const kept = waiting && !terminal && coded && stamped

      expect(kept).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('pending reference moves forward', () => {
    type Params = { code: FailureCode; status: WagerTransactionStatus }

    const theories: WagerTheory<Params>[] = [
      {
        title: 'processed after the wait',
        description: 'WHEN a waiting wager is processed SHOULD become processed',
        params: {
          code: FailureCode.REFERENCE_NOT_FOUND,
          status: WagerTransactionStatus.PROCESSED,
        },
        expected: true,
      },
      {
        title: 'rejected after the wait',
        description: 'WHEN a waiting wager is rejected SHOULD store the failure code',
        params: {
          code: FailureCode.REFERENCE_NOT_FOUND,
          status: WagerTransactionStatus.REJECTED,
        },
        expected: true,
      },
      {
        title: 'failed after the wait',
        description: 'WHEN a waiting wager fails SHOULD store the failure code',
        params: {
          code: FailureCode.INVALID_MONEY,
          status: WagerTransactionStatus.FAILED,
        },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WagerTheory<Params>) => {
      const wager = WagerProbe.open(WagerTransactionKind.ROLLBACK, identity.reference)

      wager.markPendingReference()

      const processed = params.status === WagerTransactionStatus.PROCESSED
      const rejected = params.status === WagerTransactionStatus.REJECTED
      const failed = params.status === WagerTransactionStatus.FAILED

      if (processed) { wager.markProcessed(identity.linked, instant.processed) }
      if (rejected) { wager.reject(params.code) }
      if (failed) { wager.fail(params.code) }

      const moved = wager.status === params.status
      const terminal = wager.isTerminal()
      const coded = processed ? wager.failureCode === undefined : wager.failureCode === params.code
      const kept = moved && terminal && coded

      expect(kept).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('reject and fail', () => {
    type Params = { code: FailureCode; status: WagerTransactionStatus }

    const theories: WagerTheory<Params>[] = [
      {
        title: 'insufficient funds',
        description: 'WHEN pending is rejected SHOULD become rejected with the code',
        params: {
          code: FailureCode.INSUFFICIENT_FUNDS,
          status: WagerTransactionStatus.REJECTED,
        },
        expected: true,
      },
      {
        title: 'invalid money',
        description: 'WHEN pending fails SHOULD become failed with the code',
        params: {
          code: FailureCode.INVALID_MONEY,
          status: WagerTransactionStatus.FAILED,
        },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WagerTheory<Params>) => {
      const wager = WagerProbe.open(WagerTransactionKind.BET, undefined)
      const rejected = params.status === WagerTransactionStatus.REJECTED

      if (rejected) { wager.reject(params.code) }
      if (!rejected) { wager.fail(params.code) }

      const moved = wager.status === params.status
      const coded = wager.failureCode === params.code
      const terminal = wager.isTerminal()
      const stamped = wager.processedAt === undefined
      const kept = moved && coded && terminal && stamped

      expect(kept).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('terminal status', () => {
    type Params = { status: WagerTransactionStatus; failureCode: FailureCode | undefined }

    const theories: WagerTheory<Params>[] = [
      {
        title: 'processed',
        description: 'WHEN processed is asked to move SHOULD throw and stay processed',
        params: { status: WagerTransactionStatus.PROCESSED, failureCode: undefined },
        expected: true,
      },
      {
        title: 'rejected',
        description: 'WHEN rejected is asked to move SHOULD throw and keep the code',
        params: {
          status: WagerTransactionStatus.REJECTED,
          failureCode: FailureCode.INSUFFICIENT_FUNDS,
        },
        expected: true,
      },
      {
        title: 'failed',
        description: 'WHEN failed is asked to move SHOULD throw and keep the code',
        params: {
          status: WagerTransactionStatus.FAILED,
          failureCode: FailureCode.INVALID_MONEY,
        },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WagerTheory<Params>) => {
      const wager = WagerProbe.stored(
        WagerTransactionKind.BET,
        params.status,
        undefined,
        params.failureCode,
      )
      const read = () => wager.markProcessed(identity.linked, instant.processed)
      const message = WagerProbe.message(read)
      const stayed = wager.status === params.status
      const coded = wager.failureCode === params.failureCode
      const kept = message === TERMINAL_STATUS_MESSAGE && stayed && coded

      expect(kept).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('repeated pending reference', () => {
    const theories: WagerTheory<undefined>[] = [
      {
        title: 'second wait',
        description: 'WHEN a waiting wager waits again SHOULD throw and stay waiting',
        params: undefined,
        expected: true,
      },
    ]

    const prove = ({ expected }: WagerTheory<undefined>) => {
      const wager = WagerProbe.open(WagerTransactionKind.REFUND, identity.reference)

      wager.markPendingReference()

      const read = () => wager.markPendingReference()
      const message = WagerProbe.message(read)
      const waiting = wager.status === WagerTransactionStatus.PENDING_REFERENCE
      const kept = message === STATUS_TRANSITION_MESSAGE && waiting

      expect(kept).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('rehydrate', () => {
    const theories: WagerTheory<undefined>[] = [
      {
        title: 'refund without a reference',
        description: 'WHEN a stored refund has no reference SHOULD rebuild without checking',
        params: undefined,
        expected: true,
      },
    ]

    const prove = ({ expected }: WagerTheory<undefined>) => {
      const wager = WagerProbe.stored(
        WagerTransactionKind.REFUND,
        WagerTransactionStatus.PENDING,
        undefined,
        undefined,
      )
      const pending = wager.status === WagerTransactionStatus.PENDING
      const required = wager.requiresReference()
      const missing = wager.referenceExternalTransactionId === undefined
      const kept = pending && required && missing

      expect(kept).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('failure codes', () => {
    type Params = { code: FailureCode }

    const toTheory = (code: FailureCode): WagerTheory<Params> => {
      const theory = {
        title: code,
        description: 'WHEN reject receives the code SHOULD store it',
        params: { code },
        expected: true,
      }

      return theory
    }

    const theories = catalog.map(toTheory)

    const prove = ({ params, expected }: WagerTheory<Params>) => {
      const wager = WagerProbe.open(WagerTransactionKind.BET, undefined)

      wager.reject(params.code)

      const rejected = wager.status === WagerTransactionStatus.REJECTED
      const coded = wager.failureCode === params.code
      const terminal = wager.isTerminal()
      const kept = rejected && coded && terminal

      expect(kept).toBe(expected)
    }

    test('catalog', () => {
      const codes = Object.values(FailureCode)

      expect(codes).toEqual(catalog)
    })

    test.each(theories)('$title - $description', prove)
  })
})
