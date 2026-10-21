import { describe, expect, test } from 'bun:test'
import { TheoryProtocol } from '../../infrastructure/protocols/theory.protocol'
import { Money } from './money'

interface MoneyTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

const currency = {
  brl: 'BRL',
  usd: 'USD',
  lower: 'brl',
  short: 'BR',
  empty: '',
}

const amount = {
  ten: '10.00',
  plainTen: '10',
  twenty: '20.00',
  thirty: '30.00',
  twentyFive: '25.00',
  cents: '0.10',
  moreCents: '0.20',
  sum: '0.30',
  whole: '25',
  wholeSerial: '25.00',
  fraction: '25.5',
  fractionSerial: '25.50',
  negativeResult: '-15.00',
  negated: '-10.00',
}

const rejected = {
  nan: 'NaN',
  infinity: 'Infinity',
  minusInfinity: '-Infinity',
  scientific: '1e2',
  scientificLower: '1E-2',
  empty: '',
  scale: '10.001',
  below: '-1.00',
}

const failed = (read: () => void) => {
  try {
    read()
    return false
  } catch {
    return true
  }
}

const open = (value: string, code: string) => {
  const props = { amount: value, currency: code }

  return () => Money.from(props)
}

const openZero = (code: string) => {
  return () => Money.zero(code)
}

describe('Money', () => {
  describe('toJSON', () => {
    type Params = { amount: string; currency: string; serial: string }

    const theories: MoneyTheory<Params>[] = [
      {
        title: 'whole amount',
        description: 'WHEN amount is 25 SHOULD serialize as 25.00',
        params: { amount: amount.whole, currency: currency.brl, serial: amount.wholeSerial },
        expected: true,
      },
      {
        title: 'one decimal place',
        description: 'WHEN amount is 25.5 SHOULD serialize as 25.50',
        params: { amount: amount.fraction, currency: currency.brl, serial: amount.fractionSerial },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: MoneyTheory<Params>) => {
      const money = Money.from({ amount: params.amount, currency: params.currency })
      const json = money.toJSON()
      const same = json.amount === params.serial && json.currency === params.currency

      expect(same).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('from', () => {
    type Params = { amount: string; currency: string }

    const theories: MoneyTheory<Params>[] = [
      {
        title: 'not a number',
        description: 'WHEN amount is NaN SHOULD throw',
        params: { amount: rejected.nan, currency: currency.brl },
        expected: true,
      },
      {
        title: 'infinity',
        description: 'WHEN amount is Infinity SHOULD throw',
        params: { amount: rejected.infinity, currency: currency.brl },
        expected: true,
      },
      {
        title: 'negative infinity',
        description: 'WHEN amount is -Infinity SHOULD throw',
        params: { amount: rejected.minusInfinity, currency: currency.brl },
        expected: true,
      },
      {
        title: 'scientific notation',
        description: 'WHEN amount uses scientific notation SHOULD throw',
        params: { amount: rejected.scientific, currency: currency.brl },
        expected: true,
      },
      {
        title: 'lowercase scientific notation',
        description: 'WHEN amount uses a lowercase exponent SHOULD throw',
        params: { amount: rejected.scientificLower, currency: currency.brl },
        expected: true,
      },
      {
        title: 'empty amount',
        description: 'WHEN amount is empty SHOULD throw',
        params: { amount: rejected.empty, currency: currency.brl },
        expected: true,
      },
      {
        title: 'third decimal place',
        description: 'WHEN amount has more than 2 decimal places SHOULD throw',
        params: { amount: rejected.scale, currency: currency.brl },
        expected: true,
      },
      {
        title: 'negative amount',
        description: 'WHEN amount is negative SHOULD throw',
        params: { amount: rejected.below, currency: currency.brl },
        expected: true,
      },
      {
        title: 'lowercase currency',
        description: 'WHEN currency is brl SHOULD throw',
        params: { amount: amount.ten, currency: currency.lower },
        expected: true,
      },
      {
        title: 'short currency',
        description: 'WHEN currency is BR SHOULD throw',
        params: { amount: amount.ten, currency: currency.short },
        expected: true,
      },
      {
        title: 'ten reais',
        description: 'WHEN amount is 10.00 BRL SHOULD not throw',
        params: { amount: amount.ten, currency: currency.brl },
        expected: false,
      },
    ]

    const prove = ({ params, expected }: MoneyTheory<Params>) => {
      const read = open(params.amount, params.currency)
      const refused = failed(read)

      expect(refused).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('zero', () => {
    type Params = { currency: string }

    const theories: MoneyTheory<Params>[] = [
      {
        title: 'empty currency',
        description: 'WHEN currency is empty SHOULD throw',
        params: { currency: currency.empty },
        expected: true,
      },
      {
        title: 'brazilian real',
        description: 'WHEN currency is BRL SHOULD not throw',
        params: { currency: currency.brl },
        expected: false,
      },
    ]

    const prove = ({ params, expected }: MoneyTheory<Params>) => {
      const read = openZero(params.currency)
      const refused = failed(read)

      expect(refused).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('add', () => {
    type Params = { left: string; right: string; currency: string; serial: string }

    const theories: MoneyTheory<Params>[] = [
      {
        title: 'ten plus twenty',
        description: 'WHEN 10.00 adds 20.00 SHOULD equal 30.00',
        params: {
          left: amount.ten,
          right: amount.twenty,
          currency: currency.brl,
          serial: amount.thirty,
        },
        expected: true,
      },
      {
        title: 'cents',
        description: 'WHEN 0.10 adds 0.20 SHOULD equal 0.30',
        params: {
          left: amount.cents,
          right: amount.moreCents,
          currency: currency.brl,
          serial: amount.sum,
        },
        expected: true,
      },
      {
        title: 'dollars',
        description: 'WHEN 10.00 USD adds 10.00 USD SHOULD equal 20.00',
        params: {
          left: amount.ten,
          right: amount.ten,
          currency: currency.usd,
          serial: amount.twenty,
        },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: MoneyTheory<Params>) => {
      const left = Money.from({ amount: params.left, currency: params.currency })
      const right = Money.from({ amount: params.right, currency: params.currency })
      const added = left.add(right)
      const sum = added.toJSON()
      const origin = left.toJSON()
      const same = sum.amount === params.serial && origin.amount === params.left

      expect(same).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('add with another currency', () => {
    type Params = { money: Money; other: Money }

    const real = Money.from({ amount: amount.ten, currency: currency.brl })
    const dollar = Money.from({ amount: amount.ten, currency: currency.usd })

    const theories: MoneyTheory<Params>[] = [
      {
        title: 'real and dollar',
        description: 'WHEN BRL adds USD SHOULD throw',
        params: { money: real, other: dollar },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: MoneyTheory<Params>) => {
      const read = () => params.money.add(params.other)
      const refused = failed(read)

      expect(refused).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('subtract', () => {
    type Params = { left: string; right: string; currency: string; serial: string }

    const theories: MoneyTheory<Params>[] = [
      {
        title: 'twenty minus ten',
        description: 'WHEN 20.00 subtracts 10.00 SHOULD equal 10.00',
        params: {
          left: amount.twenty,
          right: amount.ten,
          currency: currency.brl,
          serial: amount.ten,
        },
        expected: true,
      },
      {
        title: 'ten minus twenty five',
        description: 'WHEN 10.00 subtracts 25.00 SHOULD equal -15.00',
        params: {
          left: amount.ten,
          right: amount.twentyFive,
          currency: currency.brl,
          serial: amount.negativeResult,
        },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: MoneyTheory<Params>) => {
      const left = Money.from({ amount: params.left, currency: params.currency })
      const right = Money.from({ amount: params.right, currency: params.currency })
      const removed = left.subtract(right)
      const json = removed.toJSON()
      const origin = left.toJSON()
      const same = json.amount === params.serial && origin.amount === params.left

      expect(same).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('subtract with another currency', () => {
    type Params = { money: Money; other: Money }

    const real = Money.from({ amount: amount.ten, currency: currency.brl })
    const dollar = Money.from({ amount: amount.ten, currency: currency.usd })

    const theories: MoneyTheory<Params>[] = [
      {
        title: 'real and dollar',
        description: 'WHEN BRL subtracts USD SHOULD throw',
        params: { money: real, other: dollar },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: MoneyTheory<Params>) => {
      const read = () => params.money.subtract(params.other)
      const refused = failed(read)

      expect(refused).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('negate', () => {
    type Params = { amount: string; currency: string; serial: string }

    const theories: MoneyTheory<Params>[] = [
      {
        title: 'ten reais',
        description: 'WHEN 10.00 negates SHOULD serialize as -10.00',
        params: { amount: amount.ten, currency: currency.brl, serial: amount.negated },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: MoneyTheory<Params>) => {
      const money = Money.from({ amount: params.amount, currency: params.currency })
      const negated = money.negate()
      const json = negated.toJSON()
      const same = json.amount === params.serial

      expect(same).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('isZero', () => {
    type Params = { money: Money }

    const zero = Money.zero(currency.brl)
    const ten = Money.from({ amount: amount.ten, currency: currency.brl })

    const theories: MoneyTheory<Params>[] = [
      {
        title: 'zero reais',
        description: 'WHEN amount is zero SHOULD return true',
        params: { money: zero },
        expected: true,
      },
      {
        title: 'ten reais',
        description: 'WHEN amount is 10.00 SHOULD return false',
        params: { money: ten },
        expected: false,
      },
    ]

    const prove = ({ params, expected }: MoneyTheory<Params>) => {
      const zeroAmount = params.money.isZero()

      expect(zeroAmount).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('isPositive', () => {
    type Params = { money: Money }

    const zero = Money.zero(currency.brl)
    const ten = Money.from({ amount: amount.ten, currency: currency.brl })

    const theories: MoneyTheory<Params>[] = [
      {
        title: 'ten reais',
        description: 'WHEN amount is 10.00 SHOULD return true',
        params: { money: ten },
        expected: true,
      },
      {
        title: 'zero reais',
        description: 'WHEN amount is zero SHOULD return false',
        params: { money: zero },
        expected: false,
      },
    ]

    const prove = ({ params, expected }: MoneyTheory<Params>) => {
      const positive = params.money.isPositive()

      expect(positive).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('isNegative', () => {
    type Params = { money: Money }

    const zero = Money.zero(currency.brl)
    const ten = Money.from({ amount: amount.ten, currency: currency.brl })
    const negated = ten.negate()

    const theories: MoneyTheory<Params>[] = [
      {
        title: 'negated ten',
        description: 'WHEN 10.00 is negated SHOULD return true',
        params: { money: negated },
        expected: true,
      },
      {
        title: 'ten reais',
        description: 'WHEN amount is 10.00 SHOULD return false',
        params: { money: ten },
        expected: false,
      },
      {
        title: 'zero reais',
        description: 'WHEN amount is zero SHOULD return false',
        params: { money: zero },
        expected: false,
      },
    ]

    const prove = ({ params, expected }: MoneyTheory<Params>) => {
      const negative = params.money.isNegative()

      expect(negative).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('isLessThan', () => {
    type Params = { money: Money; other: Money }

    const zero = Money.zero(currency.brl)
    const ten = Money.from({ amount: amount.ten, currency: currency.brl })
    const twentyFive = Money.from({ amount: amount.twentyFive, currency: currency.brl })
    const below = ten.subtract(twentyFive)

    const theories: MoneyTheory<Params>[] = [
      {
        title: 'below zero',
        description: 'WHEN 10.00 subtracts 25.00 SHOULD return true',
        params: { money: below, other: zero },
        expected: true,
      },
      {
        title: 'ten reais',
        description: 'WHEN amount is 10.00 SHOULD return false',
        params: { money: ten, other: zero },
        expected: false,
      },
    ]

    const prove = ({ params, expected }: MoneyTheory<Params>) => {
      const less = params.money.isLessThan(params.other)

      expect(less).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('isLessThan with another currency', () => {
    type Params = { money: Money; other: Money }

    const real = Money.from({ amount: amount.ten, currency: currency.brl })
    const dollar = Money.from({ amount: amount.ten, currency: currency.usd })

    const theories: MoneyTheory<Params>[] = [
      {
        title: 'real and dollar',
        description: 'WHEN BRL compares with USD SHOULD throw',
        params: { money: real, other: dollar },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: MoneyTheory<Params>) => {
      const read = () => params.money.isLessThan(params.other)
      const refused = failed(read)

      expect(refused).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('equals', () => {
    type Params = { money: Money; other: Money }

    const ten = Money.from({ amount: amount.ten, currency: currency.brl })
    const again = Money.from({ amount: amount.plainTen, currency: currency.brl })
    const dollar = Money.from({ amount: amount.ten, currency: currency.usd })

    const theories: MoneyTheory<Params>[] = [
      {
        title: 'same value',
        description: 'WHEN 10.00 BRL equals 10 BRL SHOULD return true',
        params: { money: ten, other: again },
        expected: true,
      },
      {
        title: 'other currency',
        description: 'WHEN 10.00 BRL equals 10.00 USD SHOULD return false',
        params: { money: ten, other: dollar },
        expected: false,
      },
    ]

    const prove = ({ params, expected }: MoneyTheory<Params>) => {
      const same = params.money.equals(params.other)

      expect(same).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })
})
