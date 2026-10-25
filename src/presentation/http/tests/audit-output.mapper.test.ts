import { describe, expect, test } from 'bun:test'
import type { AuditType } from '@application/audits'
import { AuditOutputMapper } from '../mappers'

const occurredAt = new Date('2026-07-29T15:00:00.000Z')
const recordedAt = new Date('2026-07-29T15:00:01.000Z')

const event = (changes: Partial<AuditType.Event> = {}): AuditType.Event => ({
  eventId: '0190f0f0-0000-7000-8000-000000000001',
  eventType: 'WagerTransactionProcessed',
  eventVersion: 1,
  occurredAt,
  recordedAt,
  wagerId: '0190f0f0-0000-7000-8000-000000000002',
  correlationId: 'provider-a:transaction-1',
  causationId: 'sqs-message-1',
  source: 'fortune-tiger',
  actor: { type: 'provider', id: 'provider-a' },
  metadata: { status: 'PROCESSED', kind: 'BET' },
  ...changes,
})

describe('AuditOutputMapper', () => {
  test('WHEN an event is mapped SHOULD expose every recorded field', () => {
    expect(new AuditOutputMapper().map(event())).toEqual(event())
  })

  test('WHEN the event carries no actor SHOULD leave it absent', () => {
    const output = new AuditOutputMapper().map(event({ actor: undefined }))

    expect(output.actor).toBeUndefined()
  })

  test('WHEN the event carries no causation SHOULD leave it absent', () => {
    const output = new AuditOutputMapper().map(event({ causationId: undefined, wagerId: undefined }))

    expect(output.causationId).toBeUndefined()
    expect(output.wagerId).toBeUndefined()
  })
})
