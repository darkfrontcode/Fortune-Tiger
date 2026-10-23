import { Inject, Injectable } from '@nestjs/common'
import type { ClockProtocol } from '@application/time'
import { metricNames, METRIC } from '@application/observability'
import type { LoggerProtocol, MetricProtocol } from '@application/observability'
import { CLOCK } from '@application/time'
import { LOGGER } from '@application/observability'
import { ConsumerOutcome } from './enums'
import { SqsQueue } from './sqs.queue'
import type { ConsumerType } from './types'
import { WagerConsumer } from './wager.consumer'

const retryBaseSeconds = 1
const retryCapSeconds = 60
const noExponent = 0
const millisecond = 1_000

export const consumerBackoffSeconds = (attempt: number): number => {
  const exponent = Math.max(attempt - 1, noExponent)
  const seconds = retryBaseSeconds * 2 ** exponent

  return Math.min(seconds, retryCapSeconds)
}

const delay = (receiveCount: number): number => consumerBackoffSeconds(receiveCount)

const pause = (seconds: number): Promise<void> => {
  const milliseconds = seconds * millisecond

  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

@Injectable()
export class SqsConsumer {
  private running: Promise<void> | undefined
  private stopped = false
  private pollFailures = noExponent

  constructor(
    private readonly queue: SqsQueue,
    private readonly consumer: WagerConsumer,
    @Inject(CLOCK) private readonly clock: ClockProtocol,
    @Inject(LOGGER) private readonly logger: LoggerProtocol,
    @Inject(METRIC) private readonly metric: MetricProtocol,
  ) {}

  open(): void {
    const started = this.running !== undefined

    if (started) { return }

    this.stopped = false
    this.running = this.poll()
  }

  async close(): Promise<void> {
    this.stopped = true
    const running = this.running

    if (running === undefined) { return }

    await running
    this.running = undefined
  }

  async consume(message: ConsumerType.QueueMessage): Promise<void> {
    const at = this.clock.now()
    const outcome = await this.consumer.consume({ message, at })

    await this.settle(message, outcome)
  }

  private settle(message: ConsumerType.QueueMessage, outcome: ConsumerOutcome): Promise<void> {
    if (outcome === ConsumerOutcome.ACK) { return this.queue.delete(message) }

    if (outcome === ConsumerOutcome.RETRY) { return this.retry(message) }

    return this.deadLetter(message)
  }

  private async retry(message: ConsumerType.QueueMessage): Promise<void> {
    this.metric.increment(metricNames.consumerRetry)

    try {
      await this.queue.changeVisibility(message, delay(message.receiveCount))
    } catch (error) {
      this.fail(error)
    }
  }

  private async deadLetter(message: ConsumerType.QueueMessage): Promise<void> {
    this.metric.increment(metricNames.consumerDeadLetter)

    try {
      await this.queue.deadLetter(message)
      await this.queue.delete(message)
    } catch (error) {
      this.fail(error)
    }
  }

  private async poll(): Promise<void> {
    while (!this.stopped) {
      try {
        const messages = await this.queue.receive()

        this.pollFailures = noExponent
        await this.consumeBatch(messages)
      } catch (error) {
        this.pollFailures += 1
        this.fail(error)
        await pause(consumerBackoffSeconds(this.pollFailures))
      }
    }
  }

  private consumeBatch(messages: Array<ConsumerType.QueueMessage>): Promise<void> {
    const started = Promise.resolve()
    const toConsumed = async (chain: Promise<void>, message: ConsumerType.QueueMessage) => {
      await chain
      await this.consume(message)
    }

    return messages.reduce(toConsumed, started)
  }

  private readonly fail = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)

    this.logger.warn(message)
  }
}
