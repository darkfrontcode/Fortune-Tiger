import { describe, expect, test } from 'bun:test'
import type { SearchSimilarEventsUseCase, SearchType } from '@application/searches'
import { formatSearchOutput, registerSearchTool } from '../search.tool'

const useCase = {
  execute: (_input: SearchType.SimilarInput): Promise<SearchType.SearchOutput> =>
    Promise.resolve({
      items: [
        {
          id: 'event-2',
          eventType: 'WagerTransactionPendingReference',
          kind: 'WIN',
          status: 'PENDING_REFERENCE',
          failureCode: undefined,
          score: 0.7,
          wagerId: undefined,
          occurredAt: undefined,
        },
        {
          id: 'event-1',
          eventType: 'WagerTransactionRejected',
          kind: 'BET',
          status: 'REJECTED',
          failureCode: 'INSUFFICIENT_FUNDS',
          score: 0.9,
          wagerId: 'wager-1',
          occurredAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
    }),
} as unknown as SearchSimilarEventsUseCase

type Registered = {
  name: string
  handler: (args: unknown) => Promise<unknown>
}

const memoryServer = () => {
  const registered: Array<Registered> = []
  const server = {
    registerTool(name: string, _config: unknown, handler: (args: unknown) => Promise<unknown>) {
      registered.push({ name, handler })
    },
  }

  return { server, registered }
}

describe('formatSearchOutput', () => {
  test('WHEN results arrive SHOULD write one readable line per result', () => {
    const output = { items: [{ id: 'e', eventType: 'WagerTransactionRejected', kind: 'BET', status: 'REJECTED', failureCode: 'INSUFFICIENT_FUNDS', score: 0.9, wagerId: 'w-1', occurredAt: new Date('2026-01-01T00:00:00.000Z') }] }

    const text = formatSearchOutput(output)

    expect(text).toContain('score: 0.9000')
    expect(text).toContain('eventType: WagerTransactionRejected')
    expect(text).toContain('failureCode: INSUFFICIENT_FUNDS')
    expect(text).toContain('wagerId: w-1')
    expect(text).toContain('occurredAt: 2026-01-01T00:00:00.000Z')
    expect(text).not.toContain('embedding')
    expect(text).not.toContain('providerId')
  })

  test('WHEN fields are absent SHOULD omit them', () => {
    const output = { items: [{ id: 'e', eventType: 'WagerTransactionPendingReference', kind: 'WIN', status: 'PENDING_REFERENCE', failureCode: undefined, score: 0.7, wagerId: undefined, occurredAt: undefined }] }

    const text = formatSearchOutput(output)

    expect(text).not.toContain('failureCode:')
    expect(text).not.toContain('wagerId:')
    expect(text).not.toContain('occurredAt:')
  })
})

describe('registerSearchTool', () => {
  test('WHEN a query arrives SHOULD answer with the formatted results', async () => {
    const { server, registered } = memoryServer()

    registerSearchTool(server as never, useCase)

    expect(registered).toHaveLength(1)
    expect(registered[0]?.name).toBe('search_similar_events')

    const handled = await registered[0]?.handler({ query: 'a rejected bet', eventType: undefined, limit: undefined })

    expect(handled).toEqual({
      content: [{ type: 'text', text: expect.stringContaining('2 similar event(s):') }],
    })
  })

  test('WHEN the use case refuses SHOULD answer an error text', async () => {
    const failing = {
      execute: (_input: SearchType.SimilarInput): Promise<SearchType.SearchOutput> =>
        Promise.reject(new Error('The search query is empty or too long.')),
    } as unknown as SearchSimilarEventsUseCase
    const { server, registered } = memoryServer()

    registerSearchTool(server as never, failing)

    const handled = await registered[0]?.handler({ query: 'x', eventType: undefined, limit: undefined })

    expect(handled).toEqual({
      content: [{ type: 'text', text: 'The search query is empty or too long.' }],
      isError: true,
    })
  })
})
