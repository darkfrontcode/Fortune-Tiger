import { Inject, Injectable } from '@nestjs/common'
import type { Model } from 'mongoose'
import type { VectorSearchProtocol, SearchType } from '@application/searches'
import { SearchConnection } from './search.connection'
import { searchableModelName, searchableEventSchema } from './searchable-event.schema'

const path = 'embedding'
const numCandidatesPerLimit = 10

const score: Record<string, unknown> = { score: { $meta: 'vectorSearchScore' } }

const searchStage = (query: SearchType.Query, index: string) => {
  const filter = query.eventType === undefined ? {} : { filter: { eventType: query.eventType } }
  const stage = {
    index,
    path,
    queryVector: query.embedding,
    numCandidates: query.limit * numCandidatesPerLimit,
    limit: query.limit,
    ...filter,
  }

  return { $vectorSearch: stage }
}

const projection = {
  _id: 0,
  id: 1,
  eventType: 1,
  kind: 1,
  status: 1,
  failureCode: 1,
  occurredAt: 1,
  wagerId: 1,
  ...score,
}

@Injectable()
export class MongoVectorSearch implements VectorSearchProtocol {
  private readonly model: Model<SearchType.Schema>

  constructor(
    @Inject(SearchConnection) private readonly connection: SearchConnection,
    private readonly index: string,
  ) {
    this.model = connection.model(searchableModelName, searchableEventSchema)
  }

  async search(query: SearchType.Query): Promise<Array<SearchType.Result>> {
    await this.connection.ready()
    const pipeline = [searchStage(query, this.index), { $project: projection }]
    const documents = await this.model.aggregate(pipeline).exec()
    const toResult = (document: unknown): SearchType.Result => {
      const entry = document as SearchType.Result

      return entry
    }

    return documents.map(toResult)
  }
}
