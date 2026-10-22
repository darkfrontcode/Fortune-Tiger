import { describe, expect, test } from 'bun:test'
import type { Theory } from '@infrastructure/protocols'
import { Money } from '../../../money/money'
import { LedgerDirection } from '../../enums'
import { LedgerCurrencyGuard } from '../ledger-currency.guard'

interface LedgerCurrencyTheory<TParams> extends Theory<TParams> {
  title: string
  description: string
}

const currency = {
  brl: 'BRL',
  usd: 'USD',
}

const amount = {
  hundred: '100.00',
  twenty: '20.00',
  hundredTwenty: '120.00',
}

describe('LedgerCurrencyGuard', () => {
  const guard = new LedgerCurrencyGuard()

  type Params = { before: string; moved: string; after: string }

  const theories: LedgerCurrencyTheory<Params>[] = [
    {
      title: 'one currency',
      description: 'WHEN the entry moves a single currency SHOULD align',
      params: { before: currency.brl, moved: currency.brl, after: currency.brl },
      expected: true,
    },
    {
      title: 'other opening currency',
      description: 'WHEN the balance before is USD SHOULD not align',
      params: { before: currency.usd, moved: currency.brl, after: currency.brl },
      expected: false,
    },
    {
      title: 'other movement currency',
      description: 'WHEN the money is USD SHOULD not align',
      params: { before: currency.brl, moved: currency.usd, after: currency.brl },
      expected: false,
    },
    {
      title: 'other closing currency',
      description: 'WHEN the balance after is USD SHOULD not align',
      params: { before: currency.brl, moved: currency.brl, after: currency.usd },
      expected: false,
    },
  ]

  const prove = ({ params, expected }: LedgerCurrencyTheory<Params>) => {
    const balanceBefore = Money.from({ amount: amount.hundred, currency: params.before })
    const money = Money.from({ amount: amount.twenty, currency: params.moved })
    const balanceAfter = Money.from({ amount: amount.hundredTwenty, currency: params.after })
    const direction = LedgerDirection.CREDIT
    const input = { direction, balanceBefore, money, balanceAfter }
    const aligned = guard.guard(input)

    expect(aligned).toBe(expected)
  }

  test.each(theories)('$title - $description', prove)
})
