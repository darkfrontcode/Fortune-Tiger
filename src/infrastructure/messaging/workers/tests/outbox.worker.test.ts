import { describe, expect, test } from 'bun:test'
import type { ClockProtocol } from '@application/time'
import type { LoggerProtocol } from '@application/observability'
import { OutboxWorker } from '../outbox.worker'

const instant = {
  open: new Date('2026-01-01T00:00:00.000Z'),
}

const fastPeriodMs = 20
const holdMs = 80
const waitMs = 120
const empty = 0

class SlowPublisher {
  active = empty

  maxActive = empty

  async publish(): Promise<{ published: number, retried: number }> {
    this.active += 1
    this.maxActive = Math.max(this.maxActive, this.active)
    await new Promise<void>((resolve) => {
      setTimeout(resolve, holdMs)
    })
    this.active -= 1

    return { published: empty, retried: empty }
  }
}

class RecordingLogger implements LoggerProtocol {
  warn(_message: string): void {}
}

const clock: ClockProtocol = {
  now: () => instant.open,
}

class FastOutboxWorker extends OutboxWorker {
  protected override readonly periodMs: number = fastPeriodMs
}

describe('OutboxWorker', () => {
  test('WHEN publish is slow SHOULD not start overlapping batches', async () => {
    const publisher = new SlowPublisher()
    const worker = new FastOutboxWorker(
      publisher as never,
      clock,
      new RecordingLogger(),
    )

    worker.open()

    await new Promise<void>((resolve) => {
      setTimeout(resolve, waitMs)
    })

    worker.close()

    expect(publisher.maxActive).toBe(1)
  })
})
