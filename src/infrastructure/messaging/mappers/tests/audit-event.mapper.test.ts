import { describe, expect, test } from 'bun:test'
import { AuditEventMapper } from '../audit-event.mapper'

const recordedAt = new Date('2026-07-29T15:00:05.000Z')

const body = JSON.stringify({
  eventId: '0190f0f0-0000-7000-8000-000000000001',
  eventType: 'WagerTransactionProcessed',
  correlationId: 'provider-a:transaction-1',
  occurredAt: '2026-07-29T15:00:00.000Z',
  version: 1,
  data: { transactionId: 'wager-1', providerId: 'provider-a' },
})

describe('AuditEventMapper', () => {
  test('WHEN the body is an event SHOULD project it with the receive time', () => {
    const event = new AuditEventMapper().map({ body, recordedAt })

    expect(event).toMatchObject({
      eventId: '0190f0f0-0000-7000-8000-000000000001',
      eventType: 'WagerTransactionProcessed',
      eventVersion: 1,
      occurredAt: new Date('2026-07-29T15:00:00.000Z'),
      recordedAt,
      wagerId: 'wager-1',
      correlationId: 'provider-a:transaction-1',
      source: 'fortune-tiger',
      actor: { type: 'provider', id: 'provider-a' },
    })
  })

  test('WHEN the body is not an event SHOULD throw', () => {
    expect(() => new AuditEventMapper().map({ body: '{}', recordedAt })).toThrow()
  })
})
