export namespace AuditType {
  export type Actor = {
    type: string
    id: string
  }

  export type Event = {
    eventId: string
    eventType: string
    eventVersion: number
    occurredAt: Date
    recordedAt: Date
    wagerId: string | undefined
    correlationId: string
    causationId: string | undefined
    source: string
    actor: Actor | undefined
    metadata: Record<string, string>
  }

  export type Query = {
    wagerId?: string
    correlationId?: string
    eventType?: string
    from?: Date
    to?: Date
    limit: number
  }

  export type TimelineInput = {
    wagerId: string
    eventType?: string
    from?: Date
    to?: Date
    limit?: number
  }

  export type Timeline = {
    items: Array<Event>
  }
}
