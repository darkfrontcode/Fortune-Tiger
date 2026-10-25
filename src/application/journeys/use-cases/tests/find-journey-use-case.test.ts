import { describe, expect, test } from 'bun:test'
import { JourneyOutcome, JourneyStage } from '../../enums'
import type { JourneyStoreProtocol } from '../../protocols'
import type { JourneyType } from '../../types'
import { FindJourneyUseCase } from '../find-journey.use-case'

class Store implements JourneyStoreProtocol {
  readonly queries: Array<JourneyType.Query> = []

  record(): Promise<void> {
    return Promise.resolve()
  }

  timeline(query: JourneyType.Query): Promise<Array<JourneyType.Schema>> {
    this.queries.push(query)

    return Promise.resolve([])
  }
}

const providerId = 'provider'
const from = new Date('2026-01-01T00:00:00.000Z')
const to = new Date('2026-01-02T00:00:00.000Z')

describe('FindJourneyUseCase', () => {
  test('limit - WHEN absent SHOULD read 50 steps', async () => {
    const store = new Store()
    const useCase = new FindJourneyUseCase(store)
    const output = await useCase.execute({ providerId })

    expect(store.queries[0]?.limit).toBe(50)
    expect(output).toEqual({ items: [] })
  })

  test('limit - WHEN above the cap SHOULD read 100 steps', async () => {
    const store = new Store()
    const useCase = new FindJourneyUseCase(store)

    await useCase.execute({ providerId, limit: 500 })

    expect(store.queries[0]?.limit).toBe(100)
  })

  test('limit - WHEN below the floor SHOULD read 1 step', async () => {
    const store = new Store()
    const useCase = new FindJourneyUseCase(store)

    await useCase.execute({ providerId, limit: 0 })

    expect(store.queries[0]?.limit).toBe(1)
  })

  test('filter - WHEN a flow is asked SHOULD pass every filter to the store', async () => {
    const store = new Store()
    const useCase = new FindJourneyUseCase(store)

    await useCase.execute({
      providerId,
      flowId: 'provider:ext-1',
      playerId: 'player-1',
      stage: JourneyStage.DATABASE,
      outcome: JourneyOutcome.ROLLBACK,
      from,
      to,
      limit: 10,
    })

    expect(store.queries[0]).toEqual({
      providerId,
      flowId: 'provider:ext-1',
      playerId: 'player-1',
      stage: JourneyStage.DATABASE,
      outcome: JourneyOutcome.ROLLBACK,
      from,
      to,
      limit: 10,
    })
  })
})
