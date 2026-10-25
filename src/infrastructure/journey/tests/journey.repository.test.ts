import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type { Connection } from 'mongoose'
import { JourneyOutcome, JourneyStage } from '@application/journeys'
import type { JourneyType } from '@application/journeys'
import { JourneyHarness } from './journey.harness'

const providerId = 'provider-1'
const playerId = 'player-1'
const flowId = 'provider-1:ext-1'
const start = new Date('2026-01-01T00:00:00.000Z')
const second = new Date('2026-01-01T00:00:00.100Z')
const third = new Date('2026-01-01T00:00:00.200Z')
const later = new Date('2026-01-02T00:00:00.000Z')

let sequence = 0

const step = (input: Partial<JourneyType.Schema>): JourneyType.Schema => {
  sequence += 1

  return {
    stepId: `step-${sequence}`,
    flowId,
    stage: JourneyStage.ROUTE,
    operation: 'POST /wagering/transactions',
    outcome: JourneyOutcome.SUCCEEDED,
    occurredAt: start,
    durationMs: 10,
    providerId,
    playerId,
    wagerId: 'tx-1',
    walletId: 'wallet-1',
    failureCode: undefined,
    ...input,
  }
}

const query = (input: Partial<JourneyType.Query>): JourneyType.Query => ({
  flowId: undefined,
  playerId: undefined,
  providerId,
  stage: undefined,
  outcome: undefined,
  from: undefined,
  to: undefined,
  limit: 50,
  ...input,
})

let connection: Connection

beforeAll(async () => {
  connection = await JourneyHarness.open()
  await JourneyHarness.sync(connection)
})

afterEach(async () => {
  await JourneyHarness.reset(connection)
})

afterAll(async () => {
  await JourneyHarness.close(connection)
})

describe('JourneyRepository', () => {
  test('record - WHEN a step is written SHOULD read it back whole', async () => {
    const repository = JourneyHarness.repository(connection)
    const value = step({ stepId: 'step-1' })

    await repository.record(value)
    const items = await repository.timeline(query({ flowId }))

    expect(items).toHaveLength(1)
    expect(items[0]).toEqual(value)
  })

  test('record - WHEN the step repeats SHOULD refuse the duplicate', async () => {
    const repository = JourneyHarness.repository(connection)
    const value = step({ stepId: 'step-1' })

    await repository.record(value)

    await expect(repository.record(value)).rejects.toThrow()
  })

  test('timeline - WHEN the steps share a date SHOULD break the tie by step id', async () => {
    const repository = JourneyHarness.repository(connection)

    await repository.record(step({ stepId: 'step-b', occurredAt: second }))
    await repository.record(step({ stepId: 'step-a', occurredAt: second }))
    await repository.record(step({ stepId: 'step-c', occurredAt: start }))
    const items = await repository.timeline(query({ flowId }))

    expect(items.map((item) => item.stepId)).toEqual(['step-c', 'step-a', 'step-b'])
  })

  test('timeline - WHEN a filter is absent SHOULD not narrow the answer', async () => {
    const repository = JourneyHarness.repository(connection)

    await repository.record(step({ stepId: 'step-1' }))
    const items = await repository.timeline(query({}))

    expect(items).toHaveLength(1)
  })

  test('timeline - WHEN a player is asked SHOULD read only that player', async () => {
    const repository = JourneyHarness.repository(connection)

    await repository.record(step({ stepId: 'step-1' }))
    await repository.record(step({ stepId: 'step-2', playerId: 'player-2' }))
    const items = await repository.timeline(query({ playerId }))

    expect(items.map((item) => item.stepId)).toEqual(['step-1'])
  })

  test('timeline - WHEN another provider asks SHOULD read nothing', async () => {
    const repository = JourneyHarness.repository(connection)

    await repository.record(step({ stepId: 'step-1' }))
    const items = await repository.timeline(query({ providerId: 'provider-2' }))

    expect(items).toHaveLength(0)
  })

  test('timeline - WHEN the stage and the outcome are asked SHOULD read only the match', async () => {
    const repository = JourneyHarness.repository(connection)

    await repository.record(step({ stepId: 'step-1', stage: JourneyStage.DATABASE, outcome: JourneyOutcome.ROLLBACK }))
    await repository.record(step({ stepId: 'step-2', stage: JourneyStage.DATABASE, outcome: JourneyOutcome.SUCCEEDED }))
    await repository.record(step({ stepId: 'step-3', stage: JourneyStage.ROUTE }))
    const items = await repository.timeline(
      query({ stage: JourneyStage.DATABASE, outcome: JourneyOutcome.ROLLBACK }),
    )

    expect(items.map((item) => item.stepId)).toEqual(['step-1'])
  })

  test('timeline - WHEN a time range is asked SHOULD read the range only', async () => {
    const repository = JourneyHarness.repository(connection)

    await repository.record(step({ stepId: 'step-1', occurredAt: start }))
    await repository.record(step({ stepId: 'step-2', occurredAt: third }))
    const items = await repository.timeline(query({ from: second, to: later }))

    expect(items.map((item) => item.stepId)).toEqual(['step-2'])
  })

  test('timeline - WHEN the limit is smaller SHOULD read the first steps only', async () => {
    const repository = JourneyHarness.repository(connection)

    await repository.record(step({ stepId: 'step-1', occurredAt: start }))
    await repository.record(step({ stepId: 'step-2', occurredAt: second }))
    await repository.record(step({ stepId: 'step-3', occurredAt: third }))
    const items = await repository.timeline(query({ limit: 2 }))

    expect(items.map((item) => item.stepId)).toEqual(['step-1', 'step-2'])
  })

  test('record - WHEN the store is unreachable SHOULD refuse instead of buffering', async () => {
    const unreachable = JourneyHarness.unreachable()
    const repository = JourneyHarness.repository(unreachable)

    await expect(repository.record(step({ stepId: 'step-1' }))).rejects.toThrow()
    await JourneyHarness.close(unreachable)
  })

  test('timeline - WHEN the store is unreachable SHOULD refuse instead of buffering', async () => {
    const unreachable = JourneyHarness.unreachable()
    const repository = JourneyHarness.repository(unreachable)

    await expect(repository.timeline(query({}))).rejects.toThrow()
    await JourneyHarness.close(unreachable)
  })
})
