import { uuidv7 } from 'uuidv7'
import type { IntegrationEventType } from './types'

type Input<Data> = IntegrationEventType.Input<Data>
type Schema<Data> = IntegrationEventType.Schema<Data>
type Envelope<Data> = IntegrationEventType.Envelope<Data>

export abstract class IntegrationEvent<Data> {
  abstract readonly eventType: string
  abstract readonly version: number

  private readonly schema: Schema<Data>

  protected constructor(input: Input<Data>) {
    const eventId = uuidv7()
    const aggregateId = input.aggregateId
    const correlationId = input.correlationId
    const causationId = input.causationId
    const occurredAt = input.occurredAt
    const data = input.data

    this.schema = { eventId, aggregateId, correlationId, causationId, occurredAt, data }
  }

  get eventId(): string {
    return this.schema.eventId
  }

  get aggregateId(): string {
    return this.schema.aggregateId
  }

  get correlationId(): string {
    return this.schema.correlationId
  }

  get causationId(): string | undefined {
    return this.schema.causationId
  }

  get occurredAt(): Date {
    return this.schema.occurredAt
  }

  get data(): Data {
    return this.schema.data
  }

  toJSON(): Envelope<Data> {
    const eventId = this.schema.eventId
    const eventType = this.eventType
    const aggregateId = this.schema.aggregateId
    const correlationId = this.schema.correlationId
    const causationId = this.schema.causationId
    const occurredAt = this.schema.occurredAt.toISOString()
    const version = this.version
    const data = this.schema.data

    return {
      eventId,
      eventType,
      aggregateId,
      correlationId,
      causationId,
      occurredAt,
      version,
      data,
    }
  }
}
