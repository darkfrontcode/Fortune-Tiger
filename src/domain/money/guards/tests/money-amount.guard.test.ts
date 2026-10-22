import { describe, expect, test } from 'bun:test'
import type { TheoryProtocol } from '@application/protocols'
import { INVALID_MONEY_AMOUNT_MESSAGE } from '../../data'
import { MoneyAmountGuard } from '../money-amount.guard'

interface MoneyAmountTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

const blank = String()

const amount = {
  ten: '10.00',
  fraction: '10.5',
  scale: '10.001',
  negative: '-1.00',
  scientific: '1e2',
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

describe('MoneyAmountGuard', () => {
  const guard = new MoneyAmountGuard()

  type Params = { amount: string }

  const theories: MoneyAmountTheory<Params>[] = [
    {
      title: 'two decimal places',
      description: 'WHEN the amount has two decimal places SHOULD accept',
      params: { amount: amount.ten },
      expected: false,
    },
    {
      title: 'one decimal place',
      description: 'WHEN the amount has one decimal place SHOULD accept',
      params: { amount: amount.fraction },
      expected: false,
    },
    {
      title: 'third decimal place',
      description: 'WHEN the amount has three decimal places SHOULD refuse',
      params: { amount: amount.scale },
      expected: true,
    },
    {
      title: 'negative amount',
      description: 'WHEN the amount is negative SHOULD refuse',
      params: { amount: amount.negative },
      expected: true,
    },
    {
      title: 'scientific notation',
      description: 'WHEN the amount uses scientific notation SHOULD refuse',
      params: { amount: amount.scientific },
      expected: true,
    },
    {
      title: 'empty amount',
      description: 'WHEN the amount is empty SHOULD refuse',
      params: { amount: amount.empty },
      expected: true,
    },
  ]

  const prove = ({ params, expected }: MoneyAmountTheory<Params>) => {
    const value = params.amount
    const read = () => guard.guard(value)
    const message = raised(read)
    const refused = message === INVALID_MONEY_AMOUNT_MESSAGE

    expect(refused).toBe(expected)
  }

  test.each(theories)('$title - $description', prove)
})
