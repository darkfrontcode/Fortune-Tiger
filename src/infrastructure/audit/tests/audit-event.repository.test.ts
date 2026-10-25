import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { Connection } from 'mongoose'
import { uuidv7 } from 'uuidv7'
import { AuditOutcome } from '@application/audits'
import type { AuditType } from '@application/audits'
import { auditCollection } from '../audit-event.schema'
import { AuditHarness } from './audit.harness'

const recordedAt = new Date('2026-07-29T15:00:05.000Z')
const occurredAt = new Date('2026-07-29T15:00:00.000Z')

const event = (changes: Partial<AuditType.Event> = {}): AuditType.Event => ({
  eventId: uuidv7(),
  eventType: 'WagerTransactionProcessed',
  eventVersion: 1,
  occurredAt,
  recordedAt,
  wagerId: uuidv7(),
  correlationId: 'provider-a:transaction-1',
  causationId: undefined,
  source: 'fortune-tiger',
  actor: { type: 'provider', id: 'provider-a' },
  metadata: { status: 'PROCESSED', kind: 'BET' },
  ...changes,
})

class Suite {
  static connection: Connection
}

beforeAll(async () => {
  Suite.connection = await AuditHarness.open()
  await AuditHarness.sync(Suite.connection)
})

beforeEach(async () => {
  await AuditHarness.reset(Suite.connection)
})

afterAll(async () => {
  await AuditHarness.close(Suite.connection)
})

describe('AuditEventRepository', () => {
  test('WHEN an event is recorded SHOULD read it back unchanged', async () => {
    const repository = AuditHarness.repository(Suite.connection)
    const value = event()

    const outcome = await repository.record(value)
    const items = await repository.timeline({ wagerId: value.wagerId, limit: 10 })

    expect(outcome).toBe(AuditOutcome.PERSISTED)
    expect(items).toEqual([value])
  })

  test('WHEN the same event id arrives again SHOULD report the duplicate and keep one row', async () => {
    const repository = AuditHarness.repository(Suite.connection)
    const value = event()

    const first = await repository.record(value)
    const second = await repository.record(value)
    const stored = await Suite.connection.collection(auditCollection).countDocuments({ eventId: value.eventId })

    expect(first).toBe(AuditOutcome.PERSISTED)
    expect(second).toBe(AuditOutcome.DUPLICATE)
    expect(stored).toBe(1)
  })

  test('WHEN a wager filter is present SHOULD answer only that wager', async () => {
    const repository = AuditHarness.repository(Suite.connection)
    const wagerId = uuidv7()
    const kept = event({ wagerId })
    const other = event({ wagerId: uuidv7() })

    await repository.record(kept)
    await repository.record(other)

    const items = await repository.timeline({ wagerId, limit: 10 })

    expect(items.map((item) => item.eventId)).toEqual([kept.eventId])
  })

  test('WHEN a correlation filter is present SHOULD answer the whole lifecycle', async () => {
    const repository = AuditHarness.repository(Suite.connection)
    const correlationId = 'provider-a:transaction-1'
    const first = event({ correlationId, eventType: 'WagerTransactionPendingReference' })
    const second = event({ correlationId, eventType: 'WagerTransactionProcessed' })
    const other = event({ correlationId: 'provider-a:transaction-2' })

    await repository.record(first)
    await repository.record(second)
    await repository.record(other)

    const items = await repository.timeline({ correlationId, limit: 10 })

    expect(items).toHaveLength(2)
    expect(items.map((item) => item.eventType)).toEqual([
      'WagerTransactionPendingReference',
      'WagerTransactionProcessed',
    ])
  })

  test('WHEN an event type filter is present SHOULD answer only that type', async () => {
    const repository = AuditHarness.repository(Suite.connection)
    const wagerId = uuidv7()
    const kept = event({ wagerId, eventType: 'WagerTransactionRejected' })
    const other = event({ wagerId, eventType: 'WagerTransactionProcessed' })

    await repository.record(kept)
    await repository.record(other)

    const items = await repository.timeline({ wagerId, eventType: 'WagerTransactionRejected', limit: 10 })

    expect(items.map((item) => item.eventId)).toEqual([kept.eventId])
  })

  test('WHEN a time range is present SHOULD include both bounds', async () => {
    const repository = AuditHarness.repository(Suite.connection)
    const wagerId = uuidv7()
    const inside = event({ wagerId, occurredAt: new Date('2026-07-29T15:00:00.000Z') })
    const before = event({ wagerId, occurredAt: new Date('2026-07-29T14:00:00.000Z') })
    const after = event({ wagerId, occurredAt: new Date('2026-07-29T16:00:00.000Z') })

    await repository.record(before)
    await repository.record(inside)
    await repository.record(after)

    const items = await repository.timeline({
      wagerId,
      from: new Date('2026-07-29T15:00:00.000Z'),
      to: new Date('2026-07-29T16:00:00.000Z'),
      limit: 10,
    })

    expect(items.map((item) => item.eventId)).toEqual([inside.eventId, after.eventId])
  })

  test('WHEN events share a time SHOULD order by event time and then by event id', async () => {
    const repository = AuditHarness.repository(Suite.connection)
    const wagerId = uuidv7()
    const second = event({ wagerId, occurredAt, eventId: '0190f0f0-0000-7000-8000-000000000002' })
    const first = event({ wagerId, occurredAt, eventId: '0190f0f0-0000-7000-8000-000000000001' })
    const later = event({ wagerId, occurredAt: new Date('2026-07-29T15:00:01.000Z') })

    await repository.record(second)
    await repository.record(later)
    await repository.record(first)

    const items = await repository.timeline({ wagerId, limit: 10 })

    expect(items.map((item) => item.eventId)).toEqual([first.eventId, second.eventId, later.eventId])
  })

  test('WHEN a limit is present SHOULD cap the page', async () => {
    const repository = AuditHarness.repository(Suite.connection)
    const wagerId = uuidv7()

    await repository.record(event({ wagerId, occurredAt: new Date('2026-07-29T15:00:00.000Z') }))
    await repository.record(event({ wagerId, occurredAt: new Date('2026-07-29T15:00:01.000Z') }))
    await repository.record(event({ wagerId, occurredAt: new Date('2026-07-29T15:00:02.000Z') }))

    const items = await repository.timeline({ wagerId, limit: 2 })

    expect(items).toHaveLength(2)
    expect(items[0]?.occurredAt).toEqual(new Date('2026-07-29T15:00:00.000Z'))
  })

  test('WHEN no filter is present SHOULD answer every event', async () => {
    const repository = AuditHarness.repository(Suite.connection)

    await repository.record(event())
    await repository.record(event())

    const items = await repository.timeline({ limit: 10 })

    expect(items).toHaveLength(2)
  })

  test('WHEN the model is synced SHOULD keep eventId unique', async () => {
    const indexes = await Suite.connection.collection(auditCollection).indexes()
    const unique = indexes.some((index) => index.unique === true && index.key.eventId === 1)

    expect(unique).toBe(true)
  })
})
