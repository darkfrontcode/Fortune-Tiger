import { describe, expect, test } from 'bun:test'
import type { LoggerProtocol, MetricProtocol } from '@application/observability'
import type { ClockProtocol } from '@application/time'
import { JourneyOutcome, JourneyStage } from '../../enums'
import type { JourneyStoreProtocol } from '../../protocols'
import type { JourneyType } from '../../types'
import { JourneyService } from '../journey.service'

class Store implements JourneyStoreProtocol {
  readonly steps: Array<JourneyType.Schema> = []
  fail = false

  async record(step: JourneyType.Schema): Promise<void> {
    if (this.fail) { throw new Error('store is unavailable') }

    this.steps.push(step)
  }

  timeline(): Promise<Array<JourneyType.Schema>> {
    return Promise.resolve(this.steps)
  }
}

class Metric implements MetricProtocol {
  readonly counts = new Map<string, number>()

  increment(name: string): void {
    const stored = this.counts.get(name) ?? 0

    this.counts.set(name, stored + 1)
  }

  observe(): void {}

  render(): Promise<string> {
    return Promise.resolve(String())
  }
}

class Logger implements LoggerProtocol {
  readonly warnings: Array<string> = []

  child(): LoggerProtocol {
    return this
  }

  warn(message: string): void {
    this.warnings.push(message)
  }
}

class Clock implements ClockProtocol {
  constructor(private readonly instants: Array<Date>) {}

  now(): Date {
    const next = this.instants.shift()

    return next ?? new Date('2026-01-01T00:00:01.000Z')
  }
}

const startedAt = new Date('2026-01-01T00:00:00.000Z')
const settledAt = new Date('2026-01-01T00:00:00.250Z')

const input = (): JourneyType.Input => ({
  flowId: 'provider:ext-1',
  stage: JourneyStage.ROUTE,
  operation: 'POST /wagering/transactions',
  outcome: JourneyOutcome.SUCCEEDED,
  startedAt,
  providerId: 'provider',
  playerId: 'player-1',
  wagerId: 'tx-1',
  walletId: 'wallet-1',
  failureCode: undefined,
})

const service = (store: Store, metric: Metric, logger: Logger): JourneyService =>
  new JourneyService(store, new Clock([settledAt]), logger, metric)

describe('JourneyService', () => {
  test('record - WHEN the store answers SHOULD append one step and count it', async () => {
    const store = new Store()
    const metric = new Metric()
    const logger = new Logger()

    await service(store, metric, logger).record(input())

    expect(store.steps).toHaveLength(1)
    expect(store.steps[0]?.flowId).toBe('provider:ext-1')
    expect(store.steps[0]?.stage).toBe(JourneyStage.ROUTE)
    expect(store.steps[0]?.operation).toBe('POST /wagering/transactions')
    expect(store.steps[0]?.outcome).toBe(JourneyOutcome.SUCCEEDED)
    expect(store.steps[0]?.occurredAt).toEqual(startedAt)
    expect(store.steps[0]?.durationMs).toBe(250)
    expect(store.steps[0]?.stepId).toMatch(/^[0-9a-f-]{36}$/)
    expect(metric.counts.get('journey_events_recorded_total')).toBe(1)
    expect(logger.warnings).toHaveLength(0)
  })

  test('record - WHEN the store fails SHOULD count the failure and never throw', async () => {
    const store = new Store()
    const metric = new Metric()
    const logger = new Logger()
    const journey = service(store, metric, logger)
    store.fail = true

    await journey.record(input())

    expect(store.steps).toHaveLength(0)
    expect(metric.counts.get('journey_events_failures_total')).toBe(1)
    expect(logger.warnings).toEqual(['Journey step could not be stored.'])
  })

  test('record - WHEN the clock goes back SHOULD report no elapsed time', async () => {
    const store = new Store()
    const metric = new Metric()
    const logger = new Logger()
    const early = new Date('2026-01-01T00:00:00.000Z')
    const journey = new JourneyService(store, new Clock([early]), logger, metric)

    await journey.record(input())

    expect(store.steps[0]?.durationMs).toBe(0)
  })
})
