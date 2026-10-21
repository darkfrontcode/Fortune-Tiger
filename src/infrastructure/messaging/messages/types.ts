export namespace InboxMessageType {
  export type Schema = {
    messageId: string
    consumerName: string
    payloadHash: string
    receivedAt: Date
    processedAt: Date | undefined
  }

  export type ReceiveInput = {
    messageId: string
    consumerName: string
    payloadHash: string
    receivedAt: Date
  }
}

export namespace OutboxMessageType {
  export type Schema = {
    id: string
    aggregateId: string
    eventType: string
    payload: Readonly<Record<string, unknown>>
    occurredAt: Date
    attempts: number
    nextAttemptAt: Date | undefined
    publishedAt: Date | undefined
  }
}
