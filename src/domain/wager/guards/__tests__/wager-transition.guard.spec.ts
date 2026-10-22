import { describe, expect, test } from 'bun:test'
import type { TheoryProtocol } from '../../../../application/protocols'
import { STATUS_TRANSITION_MESSAGE, TERMINAL_STATUS_MESSAGE } from '../../data'
import { WagerTransactionStatus } from '../../enums'
import { WagerTransitionGuard } from '../wager-transition.guard'

interface WagerTransitionTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

const blank = String()

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

describe('WagerTransitionGuard', () => {
  const guard = new WagerTransitionGuard()

  describe('terminal', () => {
    type Params = { status: WagerTransactionStatus; target: WagerTransactionStatus }

    const theories: WagerTransitionTheory<Params>[] = [
      {
        title: 'processed to rejected',
        description: 'WHEN a PROCESSED wager moves SHOULD refuse the terminal status',
        params: {
          status: WagerTransactionStatus.PROCESSED,
          target: WagerTransactionStatus.REJECTED,
        },
        expected: true,
      },
      {
        title: 'rejected to processed',
        description: 'WHEN a REJECTED wager moves SHOULD refuse the terminal status',
        params: {
          status: WagerTransactionStatus.REJECTED,
          target: WagerTransactionStatus.PROCESSED,
        },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WagerTransitionTheory<Params>) => {
      const input = params
      const read = () => guard.guard(input)
      const message = raised(read)
      const refused = message === TERMINAL_STATUS_MESSAGE

      expect(refused).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('move', () => {
    type Params = { status: WagerTransactionStatus; target: WagerTransactionStatus }

    const theories: WagerTransitionTheory<Params>[] = [
      {
        title: 'pending to processed',
        description: 'WHEN a PENDING wager is processed SHOULD accept the move',
        params: {
          status: WagerTransactionStatus.PENDING,
          target: WagerTransactionStatus.PROCESSED,
        },
        expected: false,
      },
      {
        title: 'pending to pending',
        description: 'WHEN a PENDING wager stays PENDING SHOULD refuse the move',
        params: {
          status: WagerTransactionStatus.PENDING,
          target: WagerTransactionStatus.PENDING,
        },
        expected: true,
      },
      {
        title: 'waiting to rejected',
        description: 'WHEN a PENDING_REFERENCE wager is rejected SHOULD accept the move',
        params: {
          status: WagerTransactionStatus.PENDING_REFERENCE,
          target: WagerTransactionStatus.REJECTED,
        },
        expected: false,
      },
      {
        title: 'pending to waiting',
        description: 'WHEN a PENDING wager waits for a reference SHOULD accept the move',
        params: {
          status: WagerTransactionStatus.PENDING,
          target: WagerTransactionStatus.PENDING_REFERENCE,
        },
        expected: false,
      },
    ]

    const prove = ({ params, expected }: WagerTransitionTheory<Params>) => {
      const input = params
      const read = () => guard.guard(input)
      const message = raised(read)
      const refused = message === STATUS_TRANSITION_MESSAGE

      expect(refused).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })
})
