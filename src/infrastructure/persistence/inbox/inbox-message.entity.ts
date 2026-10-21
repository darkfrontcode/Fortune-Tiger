import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core'

@Entity({ tableName: 'inbox_messages' })
@Unique({ properties: ['consumerName', 'messageId'] })
export class InboxMessageEntity {
  @PrimaryKey({ fieldName: 'consumer_name', type: 'text' })
  consumerName!: string

  @PrimaryKey({ fieldName: 'message_id', type: 'text' })
  messageId!: string

  @Property({ fieldName: 'payload_hash', type: 'text' })
  payloadHash!: string

  @Property({ fieldName: 'received_at', type: 'timestamptz' })
  receivedAt!: Date

  @Property({ fieldName: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt?: Date
}
