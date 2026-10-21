import { InboxMessageType } from './types'

type Schema = InboxMessageType.Schema
type ReceiveInput = InboxMessageType.ReceiveInput

export class InboxMessage {
  private constructor(private schema: Schema) {}

  static receive(input: ReceiveInput): InboxMessage {
    const schema = {
      messageId: input.messageId,
      consumerName: input.consumerName,
      payloadHash: input.payloadHash,
      receivedAt: input.receivedAt,
      processedAt: undefined,
    }

    return new InboxMessage(schema)
  }

  static rehydrate(schema: Schema): InboxMessage {
    return new InboxMessage(schema)
  }

  get messageId(): string {
    return this.schema.messageId
  }

  get consumerName(): string {
    return this.schema.consumerName
  }

  get payloadHash(): string {
    return this.schema.payloadHash
  }

  get receivedAt(): Date {
    return this.schema.receivedAt
  }

  get processedAt(): Date | undefined {
    return this.schema.processedAt
  }

  isProcessed(): boolean {
    const processed = this.schema.processedAt !== undefined

    return processed
  }

  markProcessed(at: Date): void {
    this.schema.processedAt = at
  }
}
