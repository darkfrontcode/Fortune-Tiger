export namespace IntegrationEventType {
  export type Schema<Data> = {
    eventId: string
    aggregateId: string
    correlationId: string
    causationId: string | undefined
    occurredAt: Date
    data: Data
  }

  export type Input<Data> = {
    aggregateId: string
    correlationId: string
    causationId: string | undefined
    occurredAt: Date
    data: Data
  }

  export type Envelope<Data> = {
    eventId: string
    eventType: string
    aggregateId: string
    correlationId: string
    causationId?: string
    occurredAt: string
    version: number
    data: Data
  }

  export type Context = {
    correlationId: string
    causationId: string | undefined
    occurredAt: Date
  }
}
