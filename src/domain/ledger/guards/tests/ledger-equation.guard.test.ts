import { describe, expect, test } from 'bun:test'
import type { TheoryProtocol } from '../../../../application/protocols'
import { Money } from '../../../money/money'
import { BALANCE_EQUATION_MESSAGE, CURRENCY_CONFLICT_MESSAGE } from '../../data'
import { LedgerDirection } from '../../enums'
import type { MoneyType } from '../../../money/types'
import { LedgerEquationGuard } from '../ledger-equation.guard'

interface LedgerEquationTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

type Value = MoneyType.Input

const blank = String()

const currency = {
  brl: 'BRL',
  usd: 'USD',
}

const amount = {
  hundred: '100.00',
  twenty: '20.00',
  hundredTwenty: '120.00',
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

const post = (before: Value, moved: Value, after: Value) => {
  const balanceBefore = Money.from(before)
  const money = Money.from(moved)
  const balanceAfter = Money.from(after)
  const direction = LedgerDirection.CREDIT
  const input = { direction, balanceBefore, money, balanceAfter }

  return input
}

describe('LedgerEquationGuard', () => {
  const guard = new LedgerEquationGuard()

  describe('currency', () => {
    type Params = { before: string; moved: string; after: string }

    const theories: LedgerEquationTheory<Params>[] = [
      {
        title: 'one currency',
        description: 'WHEN the entry moves a single currency SHOULD accept',
        params: { before: currency.brl, moved: currency.brl, after: currency.brl },
        expected: false,
      },
      {
        title: 'other movement currency',
        description: 'WHEN the money is USD SHOULD refuse the currency',
        params: { before: currency.brl, moved: currency.usd, after: currency.brl },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: LedgerEquationTheory<Params>) => {
      const before = { amount: amount.hundred, currency: params.before }
      const moved = { amount: amount.twenty, currency: params.moved }
      const after = { amount: amount.hundredTwenty, currency: params.after }
      const input = post(before, moved, after)
      const read = () => guard.guard(input)
      const message = raised(read)
      const refused = message === CURRENCY_CONFLICT_MESSAGE

      expect(refused).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('equation', () => {
    type Params = { moved: string; after: string }

    const theories: LedgerEquationTheory<Params>[] = [
      {
        title: 'closed balance',
        description: 'WHEN the credit closes the balance SHOULD accept',
        params: { moved: amount.twenty, after: amount.hundredTwenty },
        expected: false,
      },
      {
        title: 'open balance',
        description: 'WHEN the credit leaves the balance open SHOULD refuse the equation',
        params: { moved: amount.twenty, after: amount.hundred },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: LedgerEquationTheory<Params>) => {
      const before = { amount: amount.hundred, currency: currency.brl }
      const moved = { amount: params.moved, currency: currency.brl }
      const after = { amount: params.after, currency: currency.brl }
      const input = post(before, moved, after)
      const read = () => guard.guard(input)
      const message = raised(read)
      const refused = message === BALANCE_EQUATION_MESSAGE

      expect(refused).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })
})
