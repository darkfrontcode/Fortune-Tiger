import { describe, expect, test } from 'bun:test'
import type { TheoryProtocol } from '@application/protocols'
import { WagerTransactionStatus } from '../../enums'
import { WagerTerminalGuard } from '../wager-terminal.guard'

interface WagerTerminalTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

describe('WagerTerminalGuard', () => {
  const guard = new WagerTerminalGuard()

  type Params = { status: WagerTransactionStatus }

  const theories: WagerTerminalTheory<Params>[] = [
    {
      title: 'pending',
      description: 'WHEN the status is PENDING SHOULD stay open',
      params: { status: WagerTransactionStatus.PENDING },
      expected: false,
    },
    {
      title: 'pending reference',
      description: 'WHEN the status is PENDING_REFERENCE SHOULD stay open',
      params: { status: WagerTransactionStatus.PENDING_REFERENCE },
      expected: false,
    },
    {
      title: 'processed',
      description: 'WHEN the status is PROCESSED SHOULD be terminal',
      params: { status: WagerTransactionStatus.PROCESSED },
      expected: true,
    },
    {
      title: 'rejected',
      description: 'WHEN the status is REJECTED SHOULD be terminal',
      params: { status: WagerTransactionStatus.REJECTED },
      expected: true,
    },
    {
      title: 'failed',
      description: 'WHEN the status is FAILED SHOULD be terminal',
      params: { status: WagerTransactionStatus.FAILED },
      expected: true,
    },
  ]

  const prove = ({ params, expected }: WagerTerminalTheory<Params>) => {
    const status = params.status
    const terminal = guard.guard(status)

    expect(terminal).toBe(expected)
  }

  test.each(theories)('$title - $description', prove)
})
