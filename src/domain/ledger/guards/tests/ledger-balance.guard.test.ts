import { describe, expect, test } from 'bun:test'
import type { Theory } from '@infrastructure/protocols'
import { Money } from '../../../money/money'
import { LedgerDirection } from '../../enums'
import { LedgerBalanceGuard } from '../ledger-balance.guard'

interface LedgerBalanceTheory<TParams> extends Theory<TParams> {
  title: string
  description: string
}

const currency = {
  brl: 'BRL',
  usd: 'USD',
}

const amount = {
  ten: '10.00',
  ninety: '90.00',
  hundred: '100.00',
  hundredTen: '110.00',
}

describe('LedgerBalanceGuard', () => {
  const guard = new LedgerBalanceGuard()

  type Params = {
    direction: LedgerDirection
    beforeCurrency: string
    movedCurrency: string
    afterCurrency: string
    before: string
    moved: string
    after: string
  }

  const theories: LedgerBalanceTheory<Params>[] = [
    {
      title: 'aligned credit',
      description: 'WHEN a credit adds the money SHOULD be balanced',
      params: {
        direction: LedgerDirection.CREDIT,
        beforeCurrency: currency.brl,
        movedCurrency: currency.brl,
        afterCurrency: currency.brl,
        before: amount.hundred,
        moved: amount.ten,
        after: amount.hundredTen,
      },
      expected: true,
    },
    {
      title: 'aligned debit',
      description: 'WHEN a debit subtracts the money SHOULD be balanced',
      params: {
        direction: LedgerDirection.DEBIT,
        beforeCurrency: currency.brl,
        movedCurrency: currency.brl,
        afterCurrency: currency.brl,
        before: amount.hundred,
        moved: amount.ten,
        after: amount.ninety,
      },
      expected: true,
    },
    {
      title: 'other currency',
      description: 'WHEN the money uses another currency SHOULD not be balanced',
      params: {
        direction: LedgerDirection.CREDIT,
        beforeCurrency: currency.brl,
        movedCurrency: currency.usd,
        afterCurrency: currency.brl,
        before: amount.hundred,
        moved: amount.ten,
        after: amount.hundredTen,
      },
      expected: false,
    },
    {
      title: 'wrong movement',
      description: 'WHEN the direction does not move the money SHOULD not be balanced',
      params: {
        direction: LedgerDirection.CREDIT,
        beforeCurrency: currency.brl,
        movedCurrency: currency.brl,
        afterCurrency: currency.brl,
        before: amount.hundred,
        moved: amount.ten,
        after: amount.hundred,
      },
      expected: false,
    },
  ]

  const prove = ({ params, expected }: LedgerBalanceTheory<Params>) => {
    const balanceBefore = Money.from({
      amount: params.before,
      currency: params.beforeCurrency,
    })
    const money = Money.from({ amount: params.moved, currency: params.movedCurrency })
    const balanceAfter = Money.from({ amount: params.after, currency: params.afterCurrency })
    const direction = params.direction
    const input = { direction, balanceBefore, money, balanceAfter }
    const balanced = guard.guard(input)

    expect(balanced).toBe(expected)
  }

  test.each(theories)('$title - $description', prove)
})
