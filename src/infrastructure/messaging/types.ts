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
