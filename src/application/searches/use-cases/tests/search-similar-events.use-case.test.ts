import { describe, expect, test } from 'bun:test'
import { INVALID_SEARCH_QUERY_MESSAGE } from '../../data'
import type { EmbeddingProtocol, VectorSearchProtocol } from '../../protocols'
import type { SearchType } from '../../types'
import { SearchSimilarEventsUseCase } from '../search-similar-events.use-case'

const topK = 5
const maxTextLength = 40

class Embedding implements EmbeddingProtocol {
  readonly requests: Array<string> = []

  embed(text: string): Promise<Array<number>> {
    this.requests.push(text)

    return Promise.resolve([1, 2, 3])
  }
}

class Search implements VectorSearchProtocol {
  readonly queries: Array<SearchType.Query> = []
  results: Array<SearchType.Result> = []

  search(query: SearchType.Query): Promise<Array<SearchType.Result>> {
    this.queries.push(query)

    return Promise.resolve(this.results)
  }
}

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

describe('SearchSimilarEventsUseCase', () => {
  test('search - WHEN a query arrives SHOULD embed and search', async () => {
    const embedding = new Embedding()
    const search = new Search()
    search.results = [result()]
    const useCase = new SearchSimilarEventsUseCase(embedding, search, topK, maxTextLength)

    const output = await useCase.execute({ query: 'a bet with insufficient funds', eventType: undefined, limit: undefined })

    expect(embedding.requests).toEqual(['a bet with insufficient funds'])
    expect(search.queries[0]).toEqual({
      embedding: [1, 2, 3],
      eventType: undefined,
      limit: topK,
    })
    expect(output).toEqual({ items: [result()] })
  })

  test('limit - WHEN a limit above the cap arrives SHOULD cap to the top k', async () => {
    const embedding = new Embedding()
    const search = new Search()
    const useCase = new SearchSimilarEventsUseCase(embedding, search, topK, maxTextLength)

    await useCase.execute({ query: 'a query', eventType: undefined, limit: 500 })

    expect(search.queries[0]?.limit).toBe(topK)
  })

  test('limit - WHEN a limit below the floor arrives SHOULD read one', async () => {
    const embedding = new Embedding()
    const search = new Search()
    const useCase = new SearchSimilarEventsUseCase(embedding, search, topK, maxTextLength)

    await useCase.execute({ query: 'a query', eventType: undefined, limit: 0 })

    expect(search.queries[0]?.limit).toBe(1)
  })

  test('eventType - WHEN a filter arrives SHOULD pass it to the search', async () => {
    const embedding = new Embedding()
    const search = new Search()
    const useCase = new SearchSimilarEventsUseCase(embedding, search, topK, maxTextLength)

    await useCase.execute({ query: 'a query', eventType: 'WagerTransactionRejected', limit: undefined })

    expect(search.queries[0]?.eventType).toBe('WagerTransactionRejected')
  })

  test('query - WHEN empty SHOULD refuse', async () => {
    const embedding = new Embedding()
    const search = new Search()
    const useCase = new SearchSimilarEventsUseCase(embedding, search, topK, maxTextLength)

    await expect(useCase.execute({ query: '   ', eventType: undefined, limit: undefined })).rejects.toThrow(
      INVALID_SEARCH_QUERY_MESSAGE,
    )
  })

  test('query - WHEN longer than the maximum SHOULD refuse', async () => {
    const embedding = new Embedding()
    const search = new Search()
    const useCase = new SearchSimilarEventsUseCase(embedding, search, topK, maxTextLength)
    const long = 'x'.repeat(maxTextLength + 1)

    await expect(useCase.execute({ query: long, eventType: undefined, limit: undefined })).rejects.toThrow(
      INVALID_SEARCH_QUERY_MESSAGE,
    )
  })
})
