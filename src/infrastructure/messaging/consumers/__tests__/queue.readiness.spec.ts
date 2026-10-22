import { describe, expect, test } from 'bun:test'
import { GetQueueAttributesCommand } from '@aws-sdk/client-sqs'
import type { TheoryProtocol } from '../../../../application/protocols'
import { QueueReadiness } from '../queue.readiness'

type Params = {
  reachable: boolean
}

interface QueueReadinessTheory extends TheoryProtocol<Params> {
  title: string
  description: string
}

const queueUrl = 'http://127.0.0.1:4566/000000000000/wager-transactions.fifo'

const client = (reachable: boolean) => ({
  send: (command: GetQueueAttributesCommand): Promise<unknown> =>
    reachable ? Promise.resolve(command) : Promise.reject(new Error()),
})

describe('QueueReadiness', () => {
  const theories: QueueReadinessTheory[] = [
    {
      title: 'queue reachable',
      description: 'WHEN SQS answers SHOULD report reachable',
      params: { reachable: true },
      expected: true,
    },
    {
      title: 'queue unreachable',
      description: 'WHEN SQS refuses SHOULD report unreachable',
      params: { reachable: false },
      expected: false,
    },
  ]

  const prove = async ({ params, expected }: QueueReadinessTheory) => {
    const readiness = new QueueReadiness(client(params.reachable), queueUrl)
    const reachable = await readiness.check()

    expect(reachable).toBe(expected)
  }

  test.each(theories)('$title - $description', prove)
})
