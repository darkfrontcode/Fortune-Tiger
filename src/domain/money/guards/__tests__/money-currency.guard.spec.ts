import { describe, expect, test } from 'bun:test'
import type { TheoryProtocol } from '../../../../application/protocols'
import { INVALID_CURRENCY_MESSAGE } from '../../data'
import { MoneyCurrencyGuard } from '../money-currency.guard'

interface MoneyCurrencyTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

const blank = String()

const currency = {
  brl: 'BRL',
  usd: 'USD',
  lower: 'brl',
  short: 'BR',
  long: 'BRLL',
  empty: '',
}

const raised = (read: () => void) => {
  try {
    read()

    return blank
  } catch (error) {
    const thrown = error instanceof Error

    if (!thrown) { return blank }

    return error.message
  }
}

describe('MoneyCurrencyGuard', () => {
  const guard = new MoneyCurrencyGuard()

  type Params = { currency: string }

  const theories: MoneyCurrencyTheory<Params>[] = [
    {
      title: 'brazilian real',
      description: 'WHEN the currency is BRL SHOULD accept',
      params: { currency: currency.brl },
      expected: false,
    },
    {
      title: 'american dollar',
      description: 'WHEN the currency is USD SHOULD accept',
      params: { currency: currency.usd },
      expected: false,
    },
    {
      title: 'lowercase code',
      description: 'WHEN the currency is lowercase SHOULD refuse',
      params: { currency: currency.lower },
      expected: true,
    },
    {
      title: 'short code',
      description: 'WHEN the currency has two letters SHOULD refuse',
      params: { currency: currency.short },
      expected: true,
    },
    {
      title: 'long code',
      description: 'WHEN the currency has four letters SHOULD refuse',
      params: { currency: currency.long },
      expected: true,
    },
    {
      title: 'empty code',
      description: 'WHEN the currency is empty SHOULD refuse',
      params: { currency: currency.empty },
      expected: true,
    },
  ]

  const prove = ({ params, expected }: MoneyCurrencyTheory<Params>) => {
    const code = params.currency
    const read = () => guard.guard(code)
    const message = raised(read)
    const refused = message === INVALID_CURRENCY_MESSAGE

    expect(refused).toBe(expected)
  }

  test.each(theories)('$title - $description', prove)
})
