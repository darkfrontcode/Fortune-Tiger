import type { ClockProtocol } from '@application/time'
import type { LoggerProtocol, MetricProtocol } from '@application/observability'
import { metricNames } from '@application/observability'
import type { ConsumerProtocol } from './consumer.protocol'
import { ConsumerOutcome } from './enums'
import type { SqsQueue } from './sqs.queue'
import type { ConsumerType } from './types'

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

export abstract class QueueLoop {
  private running: Promise<void> | undefined
  private stopped = false
  private pollFailures = noExponent
  private controller = new AbortController()

  protected constructor(
    private readonly queue: SqsQueue,
    private readonly consumer: ConsumerProtocol,
    private readonly clock: ClockProtocol,
    private readonly logger: LoggerProtocol,
    private readonly metric: MetricProtocol,
  ) {}

  open(): void {
    const started = this.running !== undefined

    if (started) { return }

    this.stopped = false
    this.controller = new AbortController()
    this.running = this.poll()
  }

  async close(): Promise<void> {
    this.stopped = true
    this.controller.abort()
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
    const controller = this.controller

    while (!this.stopped) {
      try {
        const messages = await this.queue.receive(controller.signal)

        this.pollFailures = noExponent
        await this.consumeBatch(messages)
      } catch (error) {
        if (this.stopped) { return }

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
