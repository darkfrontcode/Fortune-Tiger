import { describe, expect, test } from 'bun:test'
import fc from 'fast-check'
import { uuidv7 } from 'uuidv7'
import { Money } from '@domain/money'
import { LedgerDirection } from '../enums'
import { Ledger } from '../ledger'

type Movement = {
  direction: LedgerDirection
  before: number
  movement: number
  after: number
}

const currency = {
  brl: 'BRL',
  usd: 'USD',
}
const scale = 100
const maxCents = 100_000_000
const runs = 200
const step = 1

const serial = (value: number): string => (value / scale).toFixed(2)

const money = (cents: number, code: string = currency.brl): Money =>
  Money.from({ amount: serial(cents), currency: code })

const movement = (): fc.Arbitrary<Movement> =>
  fc.oneof(
    fc.nat({ max: maxCents }).chain((before) =>
      fc.integer({ min: 0, max: before }).map((after) => ({
        direction: LedgerDirection.DEBIT,
        before,
        movement: before - after,
        after,
      })),
    ),
    fc.nat({ max: maxCents }).chain((before) =>
      fc.nat({ max: maxCents }).map((taken) => ({
        direction: LedgerDirection.CREDIT,
        before,
        movement: taken,
        after: before + taken,
      })),
    ),
  )

const entry = (values: Movement): Ledger =>
  Ledger.create({
    id: uuidv7(),
    walletId: uuidv7(),
    transactionId: uuidv7(),
    direction: values.direction,
    money: money(values.movement),
    balanceBefore: money(values.before),
    balanceAfter: money(values.after),
    createdAt: new Date(),
  })

describe('Ledger properties', () => {
  test('WHEN the direction moves the balance SHOULD the entry be balanced', () => {
    fc.assert(
      fc.property(movement(), (values) => {
        const ledger = entry(values)

        expect(ledger.isBalanced()).toBe(true)
        expect(ledger.money.amount).toBe(serial(values.movement))
        expect(ledger.balanceAfter.amount).toBe(serial(values.after))
      }),
      { numRuns: runs },
    )
  })

  test('WHEN the closing balance is wrong SHOULD the entry be refused', () => {
    fc.assert(
      fc.property(movement(), (values) => {
        const wrong = { ...values, after: values.after + step }
        const refused = () => entry(wrong)

        expect(refused).toThrow()
      }),
      { numRuns: runs },
    )
  })

  test('WHEN the movement currency differs from the balances SHOULD the entry be refused', () => {
    fc.assert(
      fc.property(movement(), (values) => {
        const foreign = {
          ...values,
          currency: currency.usd,
        }
        const refused = () =>
          Ledger.create({
            id: uuidv7(),
            walletId: uuidv7(),
            transactionId: uuidv7(),
            direction: foreign.direction,
            money: money(foreign.movement, foreign.currency),
            balanceBefore: money(foreign.before),
            balanceAfter: money(foreign.after),
            createdAt: new Date(),
          })

        expect(refused).toThrow()
      }),
      { numRuns: runs },
    )
  })
})
