import { describe, expect, test } from 'bun:test'
import { AuditOutcome } from '@application/audits'
import type { AuditStoreProtocol, AuditType } from '@application/audits'
import type { ClockProtocol } from '@application/time'
import type { LoggerProtocol, MetricProtocol } from '@application/observability'
import { metricNames } from '@application/observability'
import { AuditEventMapper } from '../../mappers'
import { AUDIT_STORE_FAILURE_MESSAGE, INVALID_AUDIT_EVENT_MESSAGE } from '../../messages'
import { AuditConsumer } from '../audit.consumer'
import type { ConsumerType } from '../../queues'
import { ConsumerOutcome } from '../../enums'

const receivedAt = new Date('2026-07-29T15:00:05.000Z')

const body = JSON.stringify({
  eventId: '0190f0f0-0000-7000-8000-000000000001',
  eventType: 'WagerTransactionProcessed',
  correlationId: 'provider-a:transaction-1',
  occurredAt: '2026-07-29T15:00:00.000Z',
  version: 1,
  data: { transactionId: 'wager-1', providerId: 'provider-a' },
})

const message = (value: unknown, receiveCount = 1): ConsumerType.QueueMessage => ({
  sqsMessageId: 'sqs-1',
  receiptHandle: 'receipt-1',
  body: typeof value === 'string' ? value : JSON.stringify(value),
  receiveCount,
})

class RecordingStore implements AuditStoreProtocol {
  readonly recorded = [] as Array<AuditType.Event>

  constructor(private readonly outcome: AuditOutcome = AuditOutcome.PERSISTED, private readonly failure = false) {}

  async record(event: AuditType.Event): Promise<AuditOutcome> {
    this.recorded.push(event)

    if (this.failure) { throw new Error('Mongo unavailable') }

    return this.outcome
  }

  async timeline(): Promise<Array<AuditType.Event>> {
    return []
  }
}

class RecordingLogger implements LoggerProtocol {
  readonly warnings = [] as string[]

  warn(value: string): void {
    this.warnings.push(value)
  }
}

class RecordingMetric implements MetricProtocol {
  readonly increments = [] as string[]

  increment(name: string): void {
    this.increments.push(name)
  }

  observe(): void {}

  async render(): Promise<string> {
    return ''
  }
}

const clock: ClockProtocol = {
  now: () => receivedAt,
}

const subject = (store: RecordingStore, logger: LoggerProtocol, metric: MetricProtocol) =>
  new AuditConsumer(new AuditEventMapper(), store, clock, logger, metric)

describe('AuditConsumer', () => {
  test('WHEN the event is new SHOULD persist it and ack', async () => {
    const store = new RecordingStore()
    const metric = new RecordingMetric()
    const outcome = await subject(store, new RecordingLogger(), metric).consume({ message: message(body), at: receivedAt })

    expect(outcome).toBe(ConsumerOutcome.ACK)
    expect(store.recorded).toHaveLength(1)
    expect(store.recorded[0]?.recordedAt).toEqual(receivedAt)
    expect(metric.increments).toEqual([metricNames.auditPersisted])
  })

  test('WHEN the event was already stored SHOULD ack the duplicate', async () => {
    const store = new RecordingStore(AuditOutcome.DUPLICATE)
    const metric = new RecordingMetric()
    const outcome = await subject(store, new RecordingLogger(), metric).consume({ message: message(body), at: receivedAt })

    expect(outcome).toBe(ConsumerOutcome.ACK)
    expect(metric.increments).toEqual([metricNames.auditDuplicate])
  })

  test('WHEN the store fails under the limit SHOULD retry without acking', async () => {
    const store = new RecordingStore(AuditOutcome.PERSISTED, true)
    const metric = new RecordingMetric()
    const logger = new RecordingLogger()
    const outcome = await subject(store, logger, metric).consume({ message: message(body), at: receivedAt })

    expect(outcome).toBe(ConsumerOutcome.RETRY)
    expect(metric.increments).toEqual([metricNames.auditFailure])
    expect(logger.warnings).toEqual([AUDIT_STORE_FAILURE_MESSAGE])
  })

  test('WHEN the store fails on the fifth receive SHOULD dead letter', async () => {
    const store = new RecordingStore(AuditOutcome.PERSISTED, true)
    const logger = new RecordingLogger()
    const outcome = await subject(store, logger, new RecordingMetric()).consume({
      message: message(body, 5),
      at: receivedAt,
    })

    expect(outcome).toBe(ConsumerOutcome.DEAD_LETTER)
    expect(logger.warnings).toEqual([AUDIT_STORE_FAILURE_MESSAGE])
  })

  test('WHEN the body is invalid SHOULD warn and dead letter without touching the store', async () => {
    const store = new RecordingStore()
    const logger = new RecordingLogger()
    const metric = new RecordingMetric()
    const outcome = await subject(store, logger, metric).consume({ message: message('{'), at: receivedAt })

    expect(outcome).toBe(ConsumerOutcome.DEAD_LETTER)
    expect(store.recorded).toHaveLength(0)
    expect(metric.increments).toHaveLength(0)
    expect(logger.warnings).toEqual([INVALID_AUDIT_EVENT_MESSAGE])
  })
})
