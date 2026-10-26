import { describe, expect, test } from 'bun:test'
import type { MetricProtocol } from '@application/observability'
import type { ClockProtocol } from '@application/time'
import type { Published } from '../../protocols/publisher.protocol'
import { MeasuredPublisher } from '../measured.publisher'
import { SqsPublisher } from '../sqs.publisher'
import type { PublisherType } from '../types'

const config: PublisherType.Config = {
  eventsQueueUrl: 'http://localhost:4566/000000000000/wager-events.fifo',
}

const event: Published = {
  id: '0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1',
  aggregateId: '0192f291-27dd-7d3f-8071-5f8685deef37',
  payload: { eventType: 'WagerTransactionProcessed' },
}

class QuietClient {
  async send(): Promise<unknown> {
    return {}
  }
}

class Metric implements MetricProtocol {
  readonly increments: Array<string> = []
  readonly observations: Array<[string, number]> = []

  increment(name: string): void {
    this.increments.push(name)
  }

  observe(name: string, milliseconds: number): void {
    this.observations.push([name, milliseconds])
  }

  render(): Promise<string> {
    return Promise.resolve(String())
  }
}

class Clock implements ClockProtocol {
  constructor(private readonly instants: Array<Date>) {}

  now(): Date {
    const next = this.instants.shift()

    return next ?? new Date('2026-01-01T00:00:00.250Z')
  }
}

const startedAt = new Date('2026-01-01T00:00:00.000Z')
const settledAt = new Date('2026-01-01T00:00:00.250Z')

describe('MeasuredPublisher', () => {
  test('WHEN the inner publisher is available SHOULD build the decorator', () => {
    const inner = new SqsPublisher(new QuietClient(), config)
    const metric = new Metric()
    const clock = new Clock([startedAt, settledAt])
    const publisher = new MeasuredPublisher(inner, metric, clock)

    expect(publisher).toBeInstanceOf(MeasuredPublisher)
  })

  test('WHEN publishing successfully SHOULD count and time the publish', async () => {
    const inner = new SqsPublisher(new QuietClient(), config)
    const metric = new Metric()
    const clock = new Clock([startedAt, settledAt])
    const publisher = new MeasuredPublisher(inner, metric, clock)

    await publisher.publish(event)

    expect(metric.increments).toEqual(['events_published_total'])
    expect(metric.observations).toEqual([['events_publish_milliseconds', 250]])
  })
})
