import { Inject, Injectable } from '@nestjs/common'
import type { ClockProtocol, LoggerProtocol } from '@application/protocols'
import { CLOCK, LOGGER } from '@application/tokens'
import { ConsumerOutcome } from './enums'
import { SqsQueue } from './sqs.queue'
import type { ConsumerType } from './types'
import { WagerConsumer } from './wager.consumer'

const retryBaseSeconds = 1
const retryCapSeconds = 60
const noExponent = 0

const delay = (receiveCount: number): number => {
  const exponent = Math.max(receiveCount - 1, noExponent)
  const seconds = retryBaseSeconds * 2 ** exponent

  return Math.min(seconds, retryCapSeconds)
}

@Injectable()
export class SqsConsumer {
  private running: Promise<void> | undefined
  private stopped = false

  constructor(
    private readonly queue: SqsQueue,
    private readonly consumer: WagerConsumer,
    @Inject(CLOCK) private readonly clock: ClockProtocol,
    @Inject(LOGGER) private readonly logger: LoggerProtocol,
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
    try {
      await this.queue.changeVisibility(message, delay(message.receiveCount))
    } catch (error) {
      this.fail(error)
    }
  }

  private async deadLetter(message: ConsumerType.QueueMessage): Promise<void> {
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

        await this.consumeBatch(messages)
      } catch (error) {
        this.fail(error)
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
