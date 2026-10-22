import { OutboxMessage } from '../../messaging/messages'
import { OutboxMessageEntity } from './outbox-message.entity'

export class OutboxMessageMapper {
  toDomain(entity: OutboxMessageEntity): OutboxMessage {
    const schema = {
      id: entity.id,
      aggregateId: entity.aggregateId,
      eventType: entity.eventType,
      payload: entity.payload,
      occurredAt: entity.occurredAt,
      attempts: entity.attempts,
      nextAttemptAt: entity.nextAttemptAt ?? undefined,
      publishedAt: entity.publishedAt ?? undefined,
    }

    return OutboxMessage.rehydrate(schema)
  }

  toEntity(message: OutboxMessage): OutboxMessageEntity {
    const entity = new OutboxMessageEntity()

    entity.id = message.id
    entity.aggregateId = message.aggregateId
    entity.eventType = message.eventType
    entity.payload = message.payload
    entity.occurredAt = message.occurredAt
    entity.attempts = message.attempts
    entity.nextAttemptAt = message.nextAttemptAt
    entity.publishedAt = message.publishedAt

    return entity
  }
}
