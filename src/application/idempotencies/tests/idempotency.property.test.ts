import { describe, expect, test } from 'bun:test'
import fc from 'fast-check'
import { Money } from '@domain/money'
import { WagerTransactionKind } from '@domain/wager/enums'
import { IdempotencyService } from '../services'
import type { IdempotencyType } from '../types'

type Payload = IdempotencyType.Payload

const currency = 'BRL'
const scale = 100
const maxCents = 100_000_000
const runs = 200

const serial = (value: number): string => (value / scale).toFixed(2)

const service = new IdempotencyService()

const payload = (): fc.Arbitrary<Payload> =>
  fc
    .record({
      providerId: fc.uuid(),
      externalTransactionId: fc.uuid(),
      playerId: fc.uuid(),
      walletId: fc.uuid(),
      roundId: fc.uuid(),
      gameId: fc.uuid(),
      kind: fc.constantFrom(
        WagerTransactionKind.BET,
        WagerTransactionKind.WIN,
        WagerTransactionKind.LOSS,
        WagerTransactionKind.REFUND,
        WagerTransactionKind.ROLLBACK,
      ),
      cents: fc.nat({ max: maxCents }),
      reference: fc.option(fc.uuid(), { nil: undefined }),
    })
    .map((values) => ({
      providerId: values.providerId,
      externalTransactionId: values.externalTransactionId,
      playerId: values.playerId,
      walletId: values.walletId,
      roundId: values.roundId,
      gameId: values.gameId,
      kind: values.kind,
      money: Money.from({ amount: serial(values.cents), currency }),
      referenceExternalTransactionId: values.reference,
    }))

describe('Idempotency properties', () => {
  test('WHEN the same payload is built in another key order SHOULD the digest match', () => {
    fc.assert(
      fc.property(payload(), (value) => {
        const original = service.hash(value)
        const reordered = service.hash({
          referenceExternalTransactionId: value.referenceExternalTransactionId,
          money: value.money,
          kind: value.kind,
          gameId: value.gameId,
          roundId: value.roundId,
          walletId: value.walletId,
          playerId: value.playerId,
          externalTransactionId: value.externalTransactionId,
          providerId: value.providerId,
        })

        expect(reordered).toBe(original)
      }),
      { numRuns: runs },
    )
  })

  test('WHEN a business field changes SHOULD the digest change', () => {
    fc.assert(
      fc.property(payload(), (value) => {
        const original = service.hash(value)
        const changed = service.hash({
          ...value,
          externalTransactionId: `${value.externalTransactionId}-retry`,
        })

        expect(changed).not.toBe(original)
      }),
      { numRuns: runs },
    )
  })

  test('WHEN the amount gains one cent SHOULD the digest change', () => {
    fc.assert(
      fc.property(payload(), (value) => {
        const original = service.hash(value)
        const raised = service.hash({
          ...value,
          money: Money.from({ amount: value.money.amount, currency }).add(
            Money.from({ amount: '0.01', currency }),
          ),
        })

        expect(raised).not.toBe(original)
      }),
      { numRuns: runs },
    )
  })

  test('WHEN the reference is absent SHOULD it hash like an undefined field', () => {
    fc.assert(
      fc.property(payload(), (value) => {
        const { referenceExternalTransactionId: _reference, ...rest } = value
        const withoutKey = service.hash(rest as Payload)
        const explicit = service.hash({ ...value, referenceExternalTransactionId: undefined })

        expect(withoutKey).toBe(explicit)
      }),
      { numRuns: runs },
    )
  })
})
