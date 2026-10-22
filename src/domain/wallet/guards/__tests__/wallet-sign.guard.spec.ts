import { describe, expect, test } from 'bun:test'
import type { TheoryProtocol } from '../../../../application/protocols'
import { Money } from '../../../money/money'
import { NEGATIVE_AMOUNT_MESSAGE } from '../../data'
import { WalletSignGuard } from '../wallet-sign.guard'

interface WalletSignTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

const blank = String()

const currency = {
  brl: 'BRL',
}

const amount = {
  ten: '10.00',
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

describe('WalletSignGuard', () => {
  const guard = new WalletSignGuard()

  type Params = { amount: string; negative: boolean }

  const theories: WalletSignTheory<Params>[] = [
    {
      title: 'positive amount',
      description: 'WHEN the amount is positive SHOULD accept',
      params: { amount: amount.ten, negative: false },
      expected: false,
    },
    {
      title: 'zero amount',
      description: 'WHEN the amount is zero SHOULD accept',
      params: { amount: amount.zero, negative: false },
      expected: false,
    },
    {
      title: 'negative amount',
      description: 'WHEN the amount is negative SHOULD refuse',
      params: { amount: amount.ten, negative: true },
      expected: true,
    },
  ]

  const prove = ({ params, expected }: WalletSignTheory<Params>) => {
    const opened = Money.from({ amount: params.amount, currency: currency.brl })
    const money = params.negative ? opened.negate() : opened
    const read = () => guard.guard(money)
    const message = raised(read)
    const refused = message === NEGATIVE_AMOUNT_MESSAGE

    expect(refused).toBe(expected)
  }

  test.each(theories)('$title - $description', prove)
})
