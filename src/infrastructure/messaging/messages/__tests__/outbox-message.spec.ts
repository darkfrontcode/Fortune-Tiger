import { describe, expect, test } from 'bun:test'
import { IntegrationEvent } from '../../events'
import type { IntegrationEventType } from '../../events'
import { OutboxMessage } from '../outbox-message'

type Data = {
  orderId: string
}

type Input = IntegrationEventType.Input<Data>

const ids = {
  wager: 'wager-id',
  order: 'order-id',
}

const correlation = {
  id: 'correlation-id',
}

const instant = {
  enqueued: new Date('2026-01-01T00:00:00.000Z'),
}

const retry = {
  first: 1000,
  second: 2000,
  cap: 60000,
}

const attempts = {
  empty: 0,
  first: 1,
  cap: 7,
}

const event = {
  type: 'WagerOrderRecorded',
  version: 1,
}

class WagerOrderRecorded extends IntegrationEvent<Data> {
  readonly eventType = event.type

  readonly version = event.version

  constructor(input: Input) {
    super(input)
  }
}

const data = {
  orderId: ids.order,
}

const input = {
  aggregateId: ids.wager,
  correlationId: correlation.id,
  causationId: undefined,
  occurredAt: instant.enqueued,
  data,
}

const recorded = new WagerOrderRecorded(input)

describe('OutboxMessage', () => {
  test('WHEN an event is enqueued SHOULD copy the envelope and stay pending', () => {
    const message = OutboxMessage.enqueue(recorded)
    const envelope = recorded.toJSON()

    expect(message.id).toBe(recorded.eventId)
    expect(message.aggregateId).toBe(ids.wager)
    expect(message.eventType).toBe(event.type)
    expect(message.payload).toEqual(envelope)
    expect(message.occurredAt).toEqual(instant.enqueued)
    expect(message.attempts).toBe(attempts.empty)
    expect(message.isPending()).toBe(true)
    expect(message.isDue(instant.enqueued)).toBe(true)
  })

  test('WHEN the first retry is scheduled SHOULD postpone one second', () => {
    const message = OutboxMessage.enqueue(recorded)
    const now = instant.enqueued

    message.scheduleRetry(now)

    const expected = new Date(now.getTime() + retry.first)

    expect(message.attempts).toBe(attempts.first)
    expect(message.nextAttemptAt).toEqual(expected)
    expect(message.isDue(now)).toBe(false)
  })

  test('WHEN retries repeat SHOULD double the delay up to the cap', () => {
    const message = OutboxMessage.enqueue(recorded)
    const now = instant.enqueued

    message.scheduleRetry(now)
    message.scheduleRetry(now)

    const doubled = new Date(now.getTime() + retry.second)

    expect(message.nextAttemptAt).toEqual(doubled)

    message.scheduleRetry(now)
    message.scheduleRetry(now)
    message.scheduleRetry(now)
    message.scheduleRetry(now)
    message.scheduleRetry(now)

    const capped = new Date(now.getTime() + retry.cap)

    expect(message.attempts).toBe(attempts.cap)
    expect(message.nextAttemptAt).toEqual(capped)
  })

  test('WHEN the message is published SHOULD stop being pending', () => {
    const message = OutboxMessage.enqueue(recorded)

    message.markPublished(instant.enqueued)

    expect(message.publishedAt).toEqual(instant.enqueued)
    expect(message.isPending()).toBe(false)
  })
})
