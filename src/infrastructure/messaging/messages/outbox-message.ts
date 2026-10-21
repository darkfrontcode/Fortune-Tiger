import type { IntegrationEvent } from '../events'
import { OutboxMessageType } from './types'

type Schema = OutboxMessageType.Schema

const retry = {
  seconds: 1,
  cap: 60,
  milliseconds: 1000,
}

const EMPTY_ATTEMPTS = 0

export class OutboxMessage {
  private constructor(private readonly schema: Schema) {}

  static enqueue(event: IntegrationEvent<unknown>): OutboxMessage {
    const id = event.eventId
    const aggregateId = event.aggregateId
    const eventType = event.eventType
    const payload = event.toJSON()
    const occurredAt = event.occurredAt
    const schema = {
      id,
      aggregateId,
      eventType,
      payload,
      occurredAt,
      attempts: EMPTY_ATTEMPTS,
      nextAttemptAt: undefined,
      publishedAt: undefined,
    }

    return new OutboxMessage(schema)
  }

  static rehydrate(schema: Schema): OutboxMessage {
    return new OutboxMessage(schema)
  }

  get id(): string {
    return this.schema.id
  }

  get aggregateId(): string {
    return this.schema.aggregateId
  }

  get eventType(): string {
    return this.schema.eventType
  }

  get payload(): Readonly<Record<string, unknown>> {
    return this.schema.payload
  }

  get occurredAt(): Date {
    return this.schema.occurredAt
  }

  get attempts(): number {
    return this.schema.attempts
  }

  get nextAttemptAt(): Date | undefined {
    return this.schema.nextAttemptAt
  }

  get publishedAt(): Date | undefined {
    return this.schema.publishedAt
  }

  isPending(): boolean {
    return this.schema.publishedAt === undefined
  }

  isDue(now: Date): boolean {
    const nextAttemptAt = this.schema.nextAttemptAt

    if (nextAttemptAt === undefined) { return true }

    return nextAttemptAt.getTime() <= now.getTime()
  }

  markPublished(at: Date): void {
    this.schema.publishedAt = at
  }

  scheduleRetry(now: Date): void {
    const attempts = this.schema.attempts + 1
    const exponent = attempts - 1
    const seconds = Math.min(retry.seconds * 2 ** exponent, retry.cap)
    const delay = seconds * retry.milliseconds
    const nextAttemptAt = new Date(now.getTime() + delay)

    this.schema.attempts = attempts
    this.schema.nextAttemptAt = nextAttemptAt
  }
}
