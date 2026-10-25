import { describe, expect, test } from 'bun:test'
import { INVALID_AUDIT_EVENT_MESSAGE } from '../data'
import { AuditEventGuard } from '../audit-event.guard'

const recordedAt = new Date('2026-07-29T15:00:05.000Z')
const occurredAt = '2026-07-29T15:00:00.000Z'

const envelope = (changes: Record<string, unknown> = {}) => ({
  eventId: '0190f0f0-0000-7000-8000-000000000001',
  eventType: 'WagerTransactionProcessed',
  aggregateId: '0190f0f0-0000-7000-8000-000000000002',
  correlationId: 'provider-a:transaction-1',
  causationId: 'sqs-message-1',
  occurredAt,
  version: 1,
  data: {
    transactionId: '0190f0f0-0000-7000-8000-000000000002',
    providerId: 'provider-a',
    status: 'PROCESSED',
    kind: 'BET',
    direction: 'DEBIT',
  },
  ...changes,
})

const rejected = (body: unknown): boolean => {
  const text = typeof body === 'string' ? body : JSON.stringify(body)

  try {
    AuditEventGuard.from(text, recordedAt)

    return false
  } catch (error) {
    return error instanceof Error && error.message === INVALID_AUDIT_EVENT_MESSAGE
  }
}

describe('AuditEventGuard', () => {
  test('WHEN the envelope is complete SHOULD project the audit event', () => {
    const event = AuditEventGuard.from(JSON.stringify(envelope()), recordedAt)

    expect(event).toEqual({
      eventId: '0190f0f0-0000-7000-8000-000000000001',
      eventType: 'WagerTransactionProcessed',
      eventVersion: 1,
      occurredAt: new Date(occurredAt),
      recordedAt,
      wagerId: '0190f0f0-0000-7000-8000-000000000002',
      correlationId: 'provider-a:transaction-1',
      causationId: 'sqs-message-1',
      source: 'fortune-tiger',
      actor: { type: 'provider', id: 'provider-a' },
      metadata: { status: 'PROCESSED', kind: 'BET', direction: 'DEBIT' },
    })
  })

  test('WHEN the data carries no provider SHOULD leave the actor absent', () => {
    const body = envelope({ data: { transactionId: 'wager-1' } })
    const event = AuditEventGuard.from(JSON.stringify(body), recordedAt)

    expect(event.actor).toBeUndefined()
    expect(event.metadata).toEqual({})
  })

  test('WHEN the data carries no transaction SHOULD leave the wager absent', () => {
    const body = envelope({ data: { providerId: 'provider-a' } })
    const event = AuditEventGuard.from(JSON.stringify(body), recordedAt)

    expect(event.wagerId).toBeUndefined()
  })

  test('WHEN the envelope carries no causation SHOULD leave it absent', () => {
    const body = envelope({ causationId: undefined })
    const event = AuditEventGuard.from(JSON.stringify(body), recordedAt)

    expect(event.causationId).toBeUndefined()
  })

  test('WHEN the metadata field is not text SHOULD skip it', () => {
    const body = envelope({ data: { status: 7, kind: '', direction: 'CREDIT' } })
    const event = AuditEventGuard.from(JSON.stringify(body), recordedAt)

    expect(event.metadata).toEqual({ direction: 'CREDIT' })
  })

  test.each([
    ['malformed JSON', '{'],
    ['a missing event id', envelope({ eventId: undefined })],
    ['an empty event type', envelope({ eventType: '' })],
    ['a version below one', envelope({ version: 0 })],
    ['a fractional version', envelope({ version: 1.5 })],
    ['a textual version', envelope({ version: '1' })],
    ['an invalid occurredAt', envelope({ occurredAt: 'not-a-date' })],
    ['a missing correlation id', envelope({ correlationId: undefined })],
    ['a missing data object', envelope({ data: undefined })],
    ['a data array', envelope({ data: [] })],
  ])('WHEN the envelope carries %s SHOULD refuse it', (_title, body) => {
    expect(rejected(body)).toBe(true)
  })
})
