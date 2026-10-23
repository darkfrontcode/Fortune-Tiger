import { describe, expect, test } from 'bun:test'
import fc from 'fast-check'
import { Money } from '../money'

const currency = 'BRL'
const scale = 100
const maxCents = 100_000_000
const runs = 200

const cents = (): fc.Arbitrary<number> => fc.integer({ min: 0, max: maxCents })

const serial = (value: number): string => (value / scale).toFixed(2)

const money = (): fc.Arbitrary<Money> =>
  cents().map((value) => Money.from({ amount: serial(value), currency }))

const toCents = (value: Money): number => Math.round(Number(value.amount) * scale)

describe('Money properties', () => {
  test('WHEN two amounts are added SHOULD the order not matter', () => {
    fc.assert(
      fc.property(money(), money(), (left, right) => {
        expect(left.add(right).equals(right.add(left))).toBe(true)
      }),
      { numRuns: runs },
    )
  })

  test('WHEN three amounts are added SHOULD the grouping not matter', () => {
    fc.assert(
      fc.property(money(), money(), money(), (first, second, third) => {
        const left = first.add(second).add(third)
        const right = first.add(second.add(third))

        expect(left.equals(right)).toBe(true)
      }),
      { numRuns: runs },
    )
  })

  test('WHEN zero is added SHOULD the amount stay the same', () => {
    fc.assert(
      fc.property(money(), (value) => {
        expect(value.add(Money.zero(currency)).equals(value)).toBe(true)
      }),
      { numRuns: runs },
    )
  })

  test('WHEN an amount is added and subtracted SHOULD it return to the start', () => {
    fc.assert(
      fc.property(money(), money(), (start, movement) => {
        expect(start.add(movement).subtract(movement).equals(start)).toBe(true)
      }),
      { numRuns: runs },
    )
  })

  test('WHEN an amount is serialized and read again SHOULD it equal the original', () => {
    fc.assert(
      fc.property(money(), (value) => {
        const restored = Money.from(value.toJSON())

        expect(restored.equals(value)).toBe(true)
        expect(toCents(restored)).toBe(toCents(value))
      }),
      { numRuns: runs },
    )
  })

  test('WHEN an amount is negated twice SHOULD it equal the original', () => {
    fc.assert(
      fc.property(money(), (value) => {
        expect(value.negate().negate().equals(value)).toBe(true)
      }),
      { numRuns: runs },
    )
  })

  test('WHEN an amount has a sign SHOULD exactly one query answer true', () => {
    fc.assert(
      fc.property(money(), (value) => {
        const answers = [value.isZero(), value.isPositive(), value.isNegative()]
        const positives = answers.filter((answer) => answer)

        expect(positives).toHaveLength(1)
        expect(value.isNegative()).toBe(false)
      }),
      { numRuns: runs },
    )
  })

  test('WHEN a larger amount is compared SHOULD the smaller one answer true', () => {
    fc.assert(
      fc.property(money(), cents(), (value, extra) => {
        const larger = value.add(Money.from({ amount: serial(extra), currency }))
        const same = toCents(larger) === toCents(value)

        expect(value.isLessThan(larger)).toBe(!same)
      }),
      { numRuns: runs },
    )
  })
})
