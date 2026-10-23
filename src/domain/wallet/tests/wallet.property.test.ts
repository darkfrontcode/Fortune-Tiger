import { describe, expect, test } from 'bun:test'
import fc from 'fast-check'
import { uuidv7 } from 'uuidv7'
import { Money } from '@domain/money'
import { Wallet } from '../wallet'

const currency = 'BRL'
const scale = 100
const opening = 10_000_000
const maxStep = 1_000
const runs = 100
const revision = {
  open: 1,
  step: 1,
}
const cent = 1

const serial = (value: number): string => (value / scale).toFixed(2)

const money = (cents: number): Money => Money.from({ amount: serial(cents), currency })

const operation = (): fc.Arbitrary<{ kind: string; cents: number }> =>
  fc.record({
    kind: fc.constantFrom('credit', 'debit'),
    cents: fc.integer({ min: 0, max: maxStep }),
  })

const operations = (): fc.Arbitrary<Array<{ kind: string; cents: number }>> =>
  fc.array(operation(), { maxLength: 200 })

const apply = (wallet: Wallet, entry: { kind: string; cents: number }): void => {
  const value = money(entry.cents)
  const at = new Date()

  if (entry.kind === 'credit') {
    wallet.credit(value, at)

    return
  }

  wallet.debit(value, at)
}

const open = (): Wallet =>
  Wallet.open({
    id: uuidv7(),
    playerId: uuidv7(),
    balance: money(opening),
    openedAt: new Date(),
  })

describe('Wallet properties', () => {
  test('WHEN credits and debits stay inside the balance SHOULD it equal the sum', () => {
    fc.assert(
      fc.property(operations(), (entries) => {
        const wallet = open()

        entries.forEach((entry) => {
          apply(wallet, entry)
        })

        const credits = entries
          .filter((entry) => entry.kind === 'credit')
          .reduce((total, entry) => total + entry.cents, 0)
        const debits = entries
          .filter((entry) => entry.kind === 'debit')
          .reduce((total, entry) => total + entry.cents, 0)
        const expected = opening + credits - debits
        const changes = entries.filter((entry) => entry.cents > 0).length

        expect(wallet.balance.amount).toBe(serial(expected))
        expect(wallet.balance.isNegative()).toBe(false)
        expect(wallet.version).toBe(revision.open + changes * revision.step)
      }),
      { numRuns: runs },
    )
  })

  test('WHEN a debit goes past the balance SHOULD it be refused without a change', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: opening }), (balance) => {
        const wallet = Wallet.open({
          id: uuidv7(),
          playerId: uuidv7(),
          balance: money(balance),
          openedAt: new Date(),
        })
        const before = wallet.balance.amount
        const version = wallet.version
        const excess = money(balance + cent)
        const refused = () => wallet.debit(excess, new Date())

        expect(refused).toThrow()
        expect(wallet.balance.amount).toBe(before)
        expect(wallet.version).toBe(version)
      }),
      { numRuns: runs },
    )
  })
})
