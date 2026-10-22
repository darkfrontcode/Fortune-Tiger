import { describe, expect, test } from 'bun:test'
import type { Theory } from '@infrastructure/protocols'
import { WagerTransactionKind } from '../../enums'
import { WagerReversalGuard } from '../wager-reversal.guard'

interface WagerReversalTheory<TParams> extends Theory<TParams> {
  title: string
  description: string
}

describe('WagerReversalGuard', () => {
  const guard = new WagerReversalGuard()

  type Params = { kind: WagerTransactionKind }

  const theories: WagerReversalTheory<Params>[] = [
    {
      title: 'refund',
      description: 'WHEN the kind is REFUND SHOULD reverse',
      params: { kind: WagerTransactionKind.REFUND },
      expected: true,
    },
    {
      title: 'rollback',
      description: 'WHEN the kind is ROLLBACK SHOULD reverse',
      params: { kind: WagerTransactionKind.ROLLBACK },
      expected: true,
    },
    {
      title: 'bet',
      description: 'WHEN the kind is BET SHOULD not reverse',
      params: { kind: WagerTransactionKind.BET },
      expected: false,
    },
    {
      title: 'win',
      description: 'WHEN the kind is WIN SHOULD not reverse',
      params: { kind: WagerTransactionKind.WIN },
      expected: false,
    },
    {
      title: 'loss',
      description: 'WHEN the kind is LOSS SHOULD not reverse',
      params: { kind: WagerTransactionKind.LOSS },
      expected: false,
    },
    {
      title: 'opening',
      description: 'WHEN the kind is OPENING SHOULD not reverse',
      params: { kind: WagerTransactionKind.OPENING },
      expected: false,
    },
  ]

  const prove = ({ params, expected }: WagerReversalTheory<Params>) => {
    const kind = params.kind
    const reversal = guard.guard(kind)

    expect(reversal).toBe(expected)
  }

  test.each(theories)('$title - $description', prove)
})
