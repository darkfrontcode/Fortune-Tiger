import type { EntityManager } from '@mikro-orm/postgresql'
import type { OutboxMessage } from '../../messaging/messages'
import { OutboxMessageEntity } from './outbox-message.entity'
import { OutboxMessageMapper } from './outbox-message.mapper'
import { findDueForUpdateQuery } from './queries'

const EMPTY_LENGTH = 0

export class OutboxMessageRepository {
  private readonly mapper = new OutboxMessageMapper()

  constructor(private readonly manager: EntityManager) {}

  saveMany(messages: Array<OutboxMessage>): void {
    const toEntity = (message: OutboxMessage) => this.mapper.toEntity(message)
    const entities = messages.map(toEntity)

    this.manager.persist(entities)
  }

  async findDueForUpdate(at: Date, limit: number): Promise<Array<OutboxMessage>> {
    const context = this.manager.getTransactionContext()
    const connection = this.manager.getConnection()
    const rows = await connection.execute<Array<OutboxMessageEntity>>(findDueForUpdateQuery, [at, limit], undefined, context)
    const toDomain = (row: OutboxMessageEntity) => {
      const entity = this.manager.map(OutboxMessageEntity, row)

      return this.mapper.toDomain(entity)
    }

    return rows.map(toDomain)
  }

  async updateMany(messages: Array<OutboxMessage>): Promise<void> {
    const empty = messages.length === EMPTY_LENGTH

    if (empty) { return }

    const toEntity = (message: OutboxMessage) => this.mapper.toEntity(message)
    const entities = messages.map(toEntity)

    await this.manager.upsertMany(entities)
  }
}
