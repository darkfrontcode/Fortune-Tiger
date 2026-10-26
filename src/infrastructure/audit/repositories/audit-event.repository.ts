import { Inject, Injectable } from '@nestjs/common'
import type { Model, QueryFilter, SortOrder } from 'mongoose'
import { AuditOutcome } from '@application/audits'
import type { AuditStoreProtocol, AuditType } from '@application/audits'
import { auditEventSchema, auditModelName } from '../schemas/audit-event.schema'
import { MongoConnection } from '../../mongo'

type Range = {
  $gte?: Date
  $lte?: Date
}

type Filter = QueryFilter<AuditType.Event>

const duplicateKey = 11000
const ascending: SortOrder = 1
const sort = { occurredAt: ascending, eventId: ascending }

const duplicate = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) { return false }

  const code = (error as { code?: unknown }).code

  return code === duplicateKey
}

const event = (document: AuditType.Event): AuditType.Event => ({
  eventId: document.eventId,
  eventType: document.eventType,
  eventVersion: document.eventVersion,
  occurredAt: document.occurredAt,
  recordedAt: document.recordedAt,
  wagerId: document.wagerId,
  correlationId: document.correlationId,
  causationId: document.causationId,
  source: document.source,
  actor: document.actor,
  metadata: document.metadata,
})

@Injectable()
export class AuditEventRepository implements AuditStoreProtocol {
  private readonly model: Model<AuditType.Event>

  constructor(@Inject(MongoConnection) connection: MongoConnection) {
    this.model = connection.model(auditModelName, auditEventSchema)
  }

  async record(value: AuditType.Event): Promise<AuditOutcome> {
    try {
      await this.model.create(value)

      return AuditOutcome.PERSISTED
    } catch (error) {
      if (duplicate(error)) { return AuditOutcome.DUPLICATE }

      throw error
    }
  }

  async timeline(query: AuditType.Query): Promise<Array<AuditType.Event>> {
    const filter = this.filter(query)
    const documents = await this.model
      .find(filter)
      .sort(sort)
      .limit(query.limit)
      .lean()
      .exec()

    return documents.map(event)
  }

  private filter(query: AuditType.Query): Filter {
    const range: Range = {}

    if (query.from !== undefined) { range.$gte = query.from }

    if (query.to !== undefined) { range.$lte = query.to }

    const ranged = Object.keys(range).length > 0
    const wager = query.wagerId === undefined ? {} : { wagerId: query.wagerId }
    const correlation = query.correlationId === undefined ? {} : { correlationId: query.correlationId }
    const type = query.eventType === undefined ? {} : { eventType: query.eventType }
    const occurredAt = ranged ? { occurredAt: range } : {}

    return { ...wager, ...correlation, ...type, ...occurredAt }
  }
}
