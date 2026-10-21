import type { EntityManager } from '@mikro-orm/postgresql'
import type { OutboxMessage } from '../../messaging/messages'
import { OutboxMessageMapper } from './outbox-message.mapper'

export class OutboxMessageRepository {
  private readonly mapper = new OutboxMessageMapper()

  constructor(private readonly manager: EntityManager) {}

  saveMany(messages: Array<OutboxMessage>): void {
    const toEntity = (message: OutboxMessage) => this.mapper.toEntity(message)
    const entities = messages.map(toEntity)

    this.manager.persist(entities)
  }
}
