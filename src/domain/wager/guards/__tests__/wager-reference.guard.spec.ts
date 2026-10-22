import { describe, expect, test } from 'bun:test'
import type { TheoryProtocol } from '../../../../application/protocols'
import { REFERENCE_REQUIRED_MESSAGE } from '../../data'
import { WagerTransactionKind } from '../../enums'
import { WagerReferenceGuard } from '../wager-reference.guard'

interface WagerReferenceTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

const blank = String()

const reference = {
  external: 'external-transaction',
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

describe('WagerReferenceGuard', () => {
  const guard = new WagerReferenceGuard()

  type Params = { kind: WagerTransactionKind; reference: string }

  const theories: WagerReferenceTheory<Params>[] = [
    {
      title: 'refund without a reference',
      description: 'WHEN a refund has a blank reference SHOULD refuse',
      params: { kind: WagerTransactionKind.REFUND, reference: blank },
      expected: true,
    },
    {
      title: 'rollback without a reference',
      description: 'WHEN a rollback has a blank reference SHOULD refuse',
      params: { kind: WagerTransactionKind.ROLLBACK, reference: blank },
      expected: true,
    },
    {
      title: 'refund with a reference',
      description: 'WHEN a refund has a reference SHOULD accept',
      params: { kind: WagerTransactionKind.REFUND, reference: reference.external },
      expected: false,
    },
    {
      title: 'bet without a reference',
      description: 'WHEN a bet has a blank reference SHOULD accept',
      params: { kind: WagerTransactionKind.BET, reference: blank },
      expected: false,
    },
    {
      title: 'win without a reference',
      description: 'WHEN a win has a blank reference SHOULD accept',
      params: { kind: WagerTransactionKind.WIN, reference: blank },
      expected: false,
    },
  ]

  const prove = ({ params, expected }: WagerReferenceTheory<Params>) => {
    const input = params
    const read = () => guard.guard(input)
    const message = raised(read)
    const refused = message === REFERENCE_REQUIRED_MESSAGE

    expect(refused).toBe(expected)
  }

  test.each(theories)('$title - $description', prove)
})
