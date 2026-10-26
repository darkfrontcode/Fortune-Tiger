import { describe, expect, test } from 'bun:test'
import type { SearchType } from '@application/searches'
import { MongoVectorSearch } from '../mongo-vector-search'
import { searchableModelName } from '../searchable-event.schema'

type Stage = Record<string, unknown>

const result = (): SearchType.Result => ({
  id: 'event-1',
  eventType: 'WagerTransactionRejected',
  kind: 'BET',
  status: 'REJECTED',
  failureCode: 'INSUFFICIENT_FUNDS',
  score: 0.9,
  wagerId: 'wager-1',
  occurredAt: new Date('2026-01-01T00:00:00.000Z'),
})

type Connection = {
  ready: () => Promise<void>
  model: (name: string) => unknown
}

const connectionWith = (aggregate: (pipeline: Array<Stage>) => Promise<Array<unknown>>): Connection => {
  const model = { aggregate: (pipeline: Array<Stage>) => ({ exec: () => aggregate(pipeline) }) }

  return {
    ready: async () => {},
    model: (name: string) => {
      expect(name).toBe(searchableModelName)
      return model
    },
  }
}

describe('MongoVectorSearch', () => {
  test('search - WHEN no event type SHOULD search the vector index', async () => {
    const connection = connectionWith(async () => [result()])
    const search = new MongoVectorSearch(connection as unknown as never, 'events_vector_index')

    const items = await search.search({ embedding: [1, 2, 3], eventType: undefined, limit: 5 })

    expect(items).toEqual([result()])
  })

  test('search - WHEN an event type arrives SHOULD add the filter', async () => {
    let received: Array<Stage> = []
    const connection = connectionWith(async (pipeline) => {
      received = pipeline
      return []
    })
    const search = new MongoVectorSearch(connection as unknown as never, 'index')

    await search.search({ embedding: [1], eventType: 'WagerTransactionRejected', limit: 3 })

    const stage = received[0] as { $vectorSearch: { index: string, path: string, filter?: unknown, limit: number } }
    expect(stage.$vectorSearch.filter).toEqual({ eventType: 'WagerTransactionRejected' })
    expect(stage.$vectorSearch.limit).toBe(3)
  })
})
