import { Inject, Injectable } from '@nestjs/common'
import type { Model, QueryFilter, SortOrder } from 'mongoose'
import type { JourneyStoreProtocol, JourneyType } from '@application/journeys'
import { MongoConnection } from '../mongo'
import { journeyModelName, journeyStepSchema } from './journey-step.schema'

type Range = {
  $gte?: Date
  $lte?: Date
}

type Filter = QueryFilter<JourneyType.Schema>

const ascending: SortOrder = 1
const sort = { occurredAt: ascending, stepId: ascending }

const step = (document: JourneyType.Schema): JourneyType.Schema => ({
  stepId: document.stepId,
  flowId: document.flowId,
  stage: document.stage,
  operation: document.operation,
  outcome: document.outcome,
  occurredAt: document.occurredAt,
  durationMs: document.durationMs,
  providerId: document.providerId,
  playerId: document.playerId,
  wagerId: document.wagerId,
  walletId: document.walletId,
  failureCode: document.failureCode,
})

@Injectable()
export class JourneyRepository implements JourneyStoreProtocol {
  private readonly model: Model<JourneyType.Schema>

  constructor(@Inject(MongoConnection) connection: MongoConnection) {
    this.model = connection.model(journeyModelName, journeyStepSchema)
  }

  async record(value: JourneyType.Schema): Promise<void> {
    await this.model.create(value)
  }

  async timeline(query: JourneyType.Query): Promise<Array<JourneyType.Schema>> {
    const filter = this.filter(query)
    const documents = await this.model
      .find(filter)
      .sort(sort)
      .limit(query.limit)
      .lean()
      .exec()

    return documents.map(step)
  }

  private filter(query: JourneyType.Query): Filter {
    const range: Range = {}

    if (query.from !== undefined) { range.$gte = query.from }

    if (query.to !== undefined) { range.$lte = query.to }

    const ranged = Object.keys(range).length > 0
    const provider = { providerId: query.providerId }
    const flow = query.flowId === undefined ? {} : { flowId: query.flowId }
    const player = query.playerId === undefined ? {} : { playerId: query.playerId }
    const stage = query.stage === undefined ? {} : { stage: query.stage }
    const outcome = query.outcome === undefined ? {} : { outcome: query.outcome }
    const occurredAt = ranged ? { occurredAt: range } : {}

    return { ...provider, ...flow, ...player, ...stage, ...outcome, ...occurredAt }
  }
}
