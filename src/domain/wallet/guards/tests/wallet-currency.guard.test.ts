import { describe, expect, test } from 'bun:test'
import type { TheoryProtocol } from '../../../../application/protocols'
import { CURRENCY_CONFLICT_MESSAGE } from '../../data'
import { WalletCurrencyGuard } from '../wallet-currency.guard'

interface WalletCurrencyTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

const blank = String()

const currency = {
  brl: 'BRL',
  usd: 'USD',
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

describe('WalletCurrencyGuard', () => {
  const guard = new WalletCurrencyGuard()

  type Params = { currency: string; compared: string }

  const theories: WalletCurrencyTheory<Params>[] = [
    {
      title: 'same currency',
      description: 'WHEN the wallet and the money are BRL SHOULD accept',
      params: { currency: currency.brl, compared: currency.brl },
      expected: false,
    },
    {
      title: 'other currency',
      description: 'WHEN the money currency is USD SHOULD refuse',
      params: { currency: currency.brl, compared: currency.usd },
      expected: true,
    },
    {
      title: 'empty comparison',
      description: 'WHEN the money currency is empty SHOULD refuse',
      params: { currency: currency.brl, compared: currency.empty },
      expected: true,
    },
  ]

  const prove = ({ params, expected }: WalletCurrencyTheory<Params>) => {
    const input = params
    const read = () => guard.guard(input)
    const message = raised(read)
    const refused = message === CURRENCY_CONFLICT_MESSAGE

    expect(refused).toBe(expected)
  }

  test.each(theories)('$title - $description', prove)
})
