import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/core'

@Entity({ tableName: 'outbox_messages' })
@Index({ properties: ['publishedAt', 'nextAttemptAt'] })
export class OutboxMessageEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string

  @Property({ fieldName: 'aggregate_id', type: 'text' })
  aggregateId!: string

  @Property({ fieldName: 'event_type', type: 'text' })
  eventType!: string

  @Property({ type: 'jsonb' })
  payload!: Record<string, unknown>

  @Property({ fieldName: 'occurred_at', type: 'timestamptz' })
  occurredAt!: Date

  @Property({ type: 'int' })
  attempts!: number

  @Property({ fieldName: 'next_attempt_at', type: 'timestamptz', nullable: true })
  nextAttemptAt?: Date

  @Property({ fieldName: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date
}
