import { InboxMessage } from '../../messaging/messages'
import { InboxMessageEntity } from './inbox-message.entity'

export class InboxMessageMapper {
  toDomain(entity: InboxMessageEntity): InboxMessage {
    const schema = {
      messageId: entity.messageId,
      consumerName: entity.consumerName,
      payloadHash: entity.payloadHash,
      receivedAt: entity.receivedAt,
      processedAt: entity.processedAt,
    }

    return InboxMessage.rehydrate(schema)
  }

  toEntity(message: InboxMessage): InboxMessageEntity {
    const entity = new InboxMessageEntity()

    entity.consumerName = message.consumerName
    entity.messageId = message.messageId
    entity.payloadHash = message.payloadHash
    entity.receivedAt = message.receivedAt
    entity.processedAt = message.processedAt

    return entity
  }

  write(entity: InboxMessageEntity, message: InboxMessage): void {
    entity.payloadHash = message.payloadHash
    entity.receivedAt = message.receivedAt
    entity.processedAt = message.processedAt
  }
}
