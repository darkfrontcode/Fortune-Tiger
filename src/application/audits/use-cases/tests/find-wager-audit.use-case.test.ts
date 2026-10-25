import { describe, expect, test } from 'bun:test'
import type { AuditOutcome } from '../../enums'
import type { AuditStoreProtocol } from '../../protocols'
import type { AuditType } from '../../types'
import { FindWagerAuditUseCase } from '../find-wager-audit.use-case'

const wagerId = '0190f0f0-0000-7000-8000-000000000001'
const correlationId = 'provider-a:transaction-1'
const occurredAt = new Date('2026-07-29T15:00:00.000Z')

const event: AuditType.Event = {
  eventId: '0190f0f0-0000-7000-8000-000000000002',
  eventType: 'WagerTransactionProcessed',
  eventVersion: 1,
  occurredAt,
  recordedAt: new Date('2026-07-29T15:00:01.000Z'),
  wagerId,
  correlationId,
  causationId: undefined,
  source: 'fortune-tiger',
  actor: { type: 'provider', id: 'provider-a' },
  metadata: { status: 'PROCESSED', kind: 'BET' },
}

class RecordingStore implements AuditStoreProtocol {
  readonly queries = [] as AuditType.Query[]
  readonly events = [] as Array<AuditType.Event>

  async record(): Promise<AuditOutcome> {
    throw new Error('The audit timeline never writes')
  }

  async timeline(query: AuditType.Query): Promise<Array<AuditType.Event>> {
    this.queries.push(query)

    return this.events
  }
}

const subject = (store: RecordingStore) => new FindWagerAuditUseCase(store)

describe('FindWagerAuditUseCase', () => {
  test('WHEN the limit is absent SHOULD ask for the default page', async () => {
    const store = new RecordingStore()
    await subject(store).execute({ wagerId })

    expect(store.queries).toEqual([{ wagerId, eventType: undefined, from: undefined, to: undefined, limit: 50 }])
  })

  test('WHEN a filter is present SHOULD forward it to the store', async () => {
    const store = new RecordingStore()
    const from = new Date('2026-07-29T14:00:00.000Z')
    const to = new Date('2026-07-29T16:00:00.000Z')
    await subject(store).execute({ wagerId, eventType: 'WagerTransactionRejected', from, to, limit: 10 })

    expect(store.queries).toEqual([
      { wagerId, eventType: 'WagerTransactionRejected', from, to, limit: 10 },
    ])
  })

  test('WHEN the limit is below one SHOULD clamp it to one', async () => {
    const store = new RecordingStore()
    await subject(store).execute({ wagerId, limit: 0 })

    expect(store.queries[0]?.limit).toBe(1)
  })

  test('WHEN the limit is above the cap SHOULD clamp it to one hundred', async () => {
    const store = new RecordingStore()
    await subject(store).execute({ wagerId, limit: 1_000 })

    expect(store.queries[0]?.limit).toBe(100)
  })

  test('WHEN the store answers events SHOULD return them as the timeline', async () => {
    const store = new RecordingStore()
    store.events.push(event)
    const output = await subject(store).execute({ wagerId })

    expect(output).toEqual({ items: [event] })
  })

  test('WHEN the store answers nothing SHOULD return an empty timeline', async () => {
    const output = await subject(new RecordingStore()).execute({ wagerId })

    expect(output.items).toHaveLength(0)
  })
})
