import { describe, expect, test } from 'bun:test'
import type { TheoryProtocol } from '@application/protocols'
import { Money } from '../../../money/money'
import { LedgerDirection } from '../../enums'
import { LedgerMovementGuard } from '../ledger-movement.guard'

interface LedgerMovementTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

const currency = {
  brl: 'BRL',
}

const amount = {
  ten: '10.00',
  ninety: '90.00',
  hundred: '100.00',
  hundredTen: '110.00',
}

const direction = {
  unknown: 'OTHER' as unknown as LedgerDirection,
}

describe('LedgerMovementGuard', () => {
  const guard = new LedgerMovementGuard()

  type Params = { direction: LedgerDirection; before: string; moved: string; after: string }

  const theories: LedgerMovementTheory<Params>[] = [
    {
      title: 'credit',
      description: 'WHEN a credit adds the money SHOULD balance',
      params: {
        direction: LedgerDirection.CREDIT,
        before: amount.hundred,
        moved: amount.ten,
        after: amount.hundredTen,
      },
      expected: true,
    },
    {
      title: 'credit that does not add',
      description: 'WHEN a credit keeps the balance SHOULD not balance',
      params: {
        direction: LedgerDirection.CREDIT,
        before: amount.hundred,
        moved: amount.ten,
        after: amount.hundred,
      },
      expected: false,
    },
    {
      title: 'debit',
      description: 'WHEN a debit subtracts the money SHOULD balance',
      params: {
        direction: LedgerDirection.DEBIT,
        before: amount.hundred,
        moved: amount.ten,
        after: amount.ninety,
      },
      expected: true,
    },
    {
      title: 'debit that does not subtract',
      description: 'WHEN a debit keeps the balance SHOULD not balance',
      params: {
        direction: LedgerDirection.DEBIT,
        before: amount.hundred,
        moved: amount.ten,
        after: amount.hundred,
      },
      expected: false,
    },
    {
      title: 'unknown direction',
      description: 'WHEN the direction is unknown SHOULD not balance',
      params: {
        direction: direction.unknown,
        before: amount.hundred,
        moved: amount.ten,
        after: amount.hundredTen,
      },
      expected: false,
    },
  ]

  const prove = ({ params, expected }: LedgerMovementTheory<Params>) => {
    const balanceBefore = Money.from({ amount: params.before, currency: currency.brl })
    const money = Money.from({ amount: params.moved, currency: currency.brl })
    const balanceAfter = Money.from({ amount: params.after, currency: currency.brl })
    const direction = params.direction
    const input = { direction, balanceBefore, money, balanceAfter }
    const balanced = guard.guard(input)

    expect(balanced).toBe(expected)
  }

  test.each(theories)('$title - $description', prove)
})
