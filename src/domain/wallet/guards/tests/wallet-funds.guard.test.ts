import { describe, expect, test } from 'bun:test'
import type { Theory } from '@infrastructure/protocols'
import { Money } from '../../../money/money'
import { INSUFFICIENT_FUNDS_MESSAGE } from '../../data'
import { WalletFundsGuard } from '../wallet-funds.guard'

interface WalletFundsTheory<TParams> extends Theory<TParams> {
  title: string
  description: string
}

const blank = String()

const currency = {
  brl: 'BRL',
}

const amount = {
  hundred: '100.00',
  zero: '0.00',
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

describe('WalletFundsGuard', () => {
  const guard = new WalletFundsGuard()

  type Params = { amount: string; negative: boolean }

  const theories: WalletFundsTheory<Params>[] = [
    {
      title: 'positive balance',
      description: 'WHEN the balance stays positive SHOULD accept',
      params: { amount: amount.hundred, negative: false },
      expected: false,
    },
    {
      title: 'zero balance',
      description: 'WHEN the balance reaches zero SHOULD accept',
      params: { amount: amount.zero, negative: false },
      expected: false,
    },
    {
      title: 'negative balance',
      description: 'WHEN the balance goes negative SHOULD refuse',
      params: { amount: amount.hundred, negative: true },
      expected: true,
    },
  ]

  const prove = ({ params, expected }: WalletFundsTheory<Params>) => {
    const opened = Money.from({ amount: params.amount, currency: currency.brl })
    const balance = params.negative ? opened.negate() : opened
    const read = () => guard.guard(balance)
    const message = raised(read)
    const refused = message === INSUFFICIENT_FUNDS_MESSAGE

    expect(refused).toBe(expected)
  }

  test.each(theories)('$title - $description', prove)
})
