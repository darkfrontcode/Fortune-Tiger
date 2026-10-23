import { describe, expect, test } from 'bun:test'
import type { ClockProtocol } from '@application/time'
import type { LoggerProtocol } from '@application/observability'
import { SimpleMetric } from '@infrastructure/observability'
import { ConsumerOutcome } from '../enums'
import type { SqsQueue } from '../sqs.queue'
import { consumerBackoffSeconds, SqsConsumer } from '../sqs.consumer'
import type { ConsumerType } from '../types'
import type { WagerConsumer } from '../wager.consumer'

const instant = {
  receivedAt: new Date('2026-07-29T15:00:00.000Z'),
}

const failure = {
  message: 'Dead letter unavailable',
}

type Retry = {
  message: ConsumerType.QueueMessage
  delay: number
}

class RecordingQueue {
  readonly deleted = new Array<ConsumerType.QueueMessage>()
  readonly retried = new Array<Retry>()
  readonly dead = new Array<ConsumerType.QueueMessage>()

  constructor(private readonly deadLetterFailure = false) {}

  async delete(message: ConsumerType.QueueMessage): Promise<void> {
    this.deleted.push(message)
  }

  async changeVisibility(message: ConsumerType.QueueMessage, delay: number): Promise<void> {
    this.retried.push({ message, delay })
  }

  async deadLetter(message: ConsumerType.QueueMessage): Promise<void> {
    if (this.deadLetterFailure) { throw new Error(failure.message) }

    this.dead.push(message)
  }
}

class StubConsumer {
  constructor(private readonly outcome: ConsumerOutcome) {}

  async consume(): Promise<ConsumerOutcome> {
    return this.outcome
  }
}

class DeferredConsumer {
  private resolve: ((outcome: ConsumerOutcome) => void) | undefined

  async consume(): Promise<ConsumerOutcome> {
    return new Promise((resolve) => {
      this.resolve = resolve
    })
  }

  release(outcome: ConsumerOutcome): void {
    this.resolve?.(outcome)
  }
}

class RecordingLogger implements LoggerProtocol {
  readonly warnings = new Array<string>()

  warn(message: string): void {
    this.warnings.push(message)
  }
}

const clock: ClockProtocol = {
  now: () => instant.receivedAt,
}

const message = (receiveCount = 1): ConsumerType.QueueMessage => ({
  sqsMessageId: 'sqs-1',
  receiptHandle: 'receipt-1',
  body: '{}',
  receiveCount,
})

const subject = (queue: RecordingQueue, outcome: ConsumerOutcome, logger: LoggerProtocol) =>
  new SqsConsumer(
    queue as unknown as SqsQueue,
    new StubConsumer(outcome) as unknown as WagerConsumer,
    clock,
    logger,
    new SimpleMetric(),
  )

describe('SqsConsumer', () => {
  test('WHEN poll failures repeat SHOULD grow the backoff up to the cap', () => {
    expect(consumerBackoffSeconds(1)).toBe(1)
    expect(consumerBackoffSeconds(3)).toBe(4)
    expect(consumerBackoffSeconds(10)).toBe(60)
  })

  test('WHEN the outcome is ACK SHOULD delete the message', async () => {
    const queue = new RecordingQueue()
    const consumer = subject(queue, ConsumerOutcome.ACK, new RecordingLogger())
    const current = message()
    await consumer.consume(current)

    expect(queue.deleted).toEqual([current])
    expect(queue.retried).toHaveLength(0)
    expect(queue.dead).toHaveLength(0)
  })

  test('WHEN the use case is in flight SHOULD ack only after it resolves', async () => {
    const queue = new RecordingQueue()
    const deferred = new DeferredConsumer()
    const consumer = new SqsConsumer(
      queue as unknown as SqsQueue,
      deferred as unknown as WagerConsumer,
      clock,
      new RecordingLogger(),
      new SimpleMetric(),
    )
    const current = message()
    const running = consumer.consume(current)

    await Promise.resolve()

    expect(queue.deleted).toHaveLength(0)

    deferred.release(ConsumerOutcome.ACK)
    await running

    expect(queue.deleted).toEqual([current])
  })

  test('WHEN the outcome is RETRY SHOULD change the visibility with backoff', async () => {
    const queue = new RecordingQueue()
    const consumer = subject(queue, ConsumerOutcome.RETRY, new RecordingLogger())
    const current = message(3)
    await consumer.consume(current)

    expect(queue.retried).toEqual([{ message: current, delay: 4 }])
    expect(queue.deleted).toHaveLength(0)
    expect(queue.dead).toHaveLength(0)
  })

  test('WHEN the outcome is DEAD_LETTER SHOULD send and delete the message', async () => {
    const queue = new RecordingQueue()
    const consumer = subject(queue, ConsumerOutcome.DEAD_LETTER, new RecordingLogger())
    const current = message()
    await consumer.consume(current)

    expect(queue.dead).toEqual([current])
    expect(queue.deleted).toEqual([current])
  })

  test('WHEN the dead letter send fails SHOULD keep the message for redelivery', async () => {
    const queue = new RecordingQueue(true)
    const logger = new RecordingLogger()
    const consumer = subject(queue, ConsumerOutcome.DEAD_LETTER, logger)
    await consumer.consume(message())

    expect(queue.dead).toHaveLength(0)
    expect(queue.deleted).toHaveLength(0)
    expect(logger.warnings).toEqual([failure.message])
  })
})
