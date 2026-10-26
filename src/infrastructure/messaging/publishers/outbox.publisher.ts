import { MikroORM } from '@mikro-orm/postgresql'
import { Inject, Injectable } from '@nestjs/common'
import { metricNames, METRIC } from '@application/observability'
import type { MetricProtocol } from '@application/observability'
import { JourneyOutcome, JourneyService, JourneyStage } from '@application/journeys'
import type { ClockProtocol } from '@application/time'
import { CLOCK } from '@application/time'
import type { PublisherProtocol } from '@infrastructure/messaging/protocols'
import { PUBLISHER } from '../tokens'
import { OutboxMessageRepository } from '../../persistence/repositories'
import type { OutboxMessage } from '../messages'

type Input = {
  at: Date
  limit: number
}

type Output = {
  published: number
  retried: number
}

const EMPTY = 0
const noLag = 0
const operation = 'wager-events.fifo'

const text = (value: unknown): string | undefined => {
  if (typeof value !== 'string') { return undefined }

  return value
}

const record = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) { return {} }

  return value as Record<string, unknown>
}

@Injectable()
export class OutboxPublisher {
  constructor(
    @Inject(MikroORM) private readonly orm: MikroORM,
    @Inject(PUBLISHER) private readonly publisher: PublisherProtocol,
    @Inject(METRIC) private readonly metric: MetricProtocol,
    @Inject(CLOCK) private readonly clock: ClockProtocol,
    private readonly journey: JourneyService,
  ) {}

  async publish(input: Input): Promise<Output> {
    const { at, limit } = input

    return this.orm.em.transactional(async (manager) => {
      const outbox = new OutboxMessageRepository(manager)
      const due = await outbox.findDueForUpdate(at, limit)
      const started = Promise.resolve({ published: EMPTY, retried: EMPTY })
      const toSettled = async (chain: Promise<Output>, message: OutboxMessage) => {
        const report = await chain
        const published = await this.publishOne(message, at)
        const total = published ? report.published + 1 : report.retried + 1
        const settled = published
          ? { ...report, published: total }
          : { ...report, retried: total }

        return settled
      }
      const report = await due.reduce(toSettled, started)

      await outbox.updateMany(due)

      return report
    })
  }

  private async publishOne(message: OutboxMessage, at: Date): Promise<boolean> {
    const input = { id: message.id, aggregateId: message.aggregateId, payload: message.payload }
    const startedAt = this.clock.now()

    try {
      await this.publisher.publish(input)
      message.markPublished(at)
      this.observeLag(message, at)
      this.track(message, startedAt, JourneyOutcome.SUCCEEDED)

      return true
    } catch {
      message.scheduleRetry(at)
      this.track(message, startedAt, JourneyOutcome.FAILED)

      return false
    }
  }

  private track(message: OutboxMessage, startedAt: Date, outcome: JourneyOutcome): void {
    const envelope = record(message.payload)
    const data = record(envelope.data)
    const flowId = text(envelope.correlationId) ?? message.aggregateId
    const step = {
      flowId,
      stage: JourneyStage.QUEUE,
      operation: operation,
      outcome,
      startedAt,
      providerId: text(data.providerId),
      playerId: text(data.playerId),
      wagerId: text(data.transactionId),
      walletId: text(data.walletId),
      failureCode: undefined,
    }

    void this.journey.record(step)
  }

  private observeLag(message: OutboxMessage, at: Date): void {
    const lag = Math.max(at.getTime() - message.occurredAt.getTime(), noLag)

    this.metric.observe(metricNames.outboxLag, lag)
  }
}
