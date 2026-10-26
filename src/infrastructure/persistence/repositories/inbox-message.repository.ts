import type { EntityManager } from '@mikro-orm/postgresql'
import { InboxMessage } from '../../messaging/messages'
import { InboxMessageEntity } from '../entities/inbox-message.entity'
import { InboxMessageMapper } from '../mappers/inbox-message.mapper'

export class InboxMessageRepository {
  private readonly mapper = new InboxMessageMapper()

  constructor(private readonly manager: EntityManager) {}

  async find(consumerName: string, messageId: string): Promise<InboxMessage | undefined> {
    const entity = await this.manager.findOne(InboxMessageEntity, {
      consumerName,
      messageId,
    })

    if (entity === null) { return undefined }

    const message = this.mapper.toDomain(entity)

    return message
  }

  async save(message: InboxMessage): Promise<void> {
    const entity = await this.manager.findOne(InboxMessageEntity, {
      consumerName: message.consumerName,
      messageId: message.messageId,
    })

    if (entity === null) {
      const mapped = this.mapper.toEntity(message)

      this.manager.persist(mapped)
    } else {
      this.mapper.write(entity, message)
    }

    await this.manager.flush()
  }
}
