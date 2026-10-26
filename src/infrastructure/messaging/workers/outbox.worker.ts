import { Inject, Injectable } from '@nestjs/common'
import type { ClockProtocol } from '@application/time'
import type { LoggerProtocol } from '@application/observability'
import { CLOCK } from '@application/time'
import { LOGGER } from '@application/observability'
import { OutboxPublisher } from '../publishers'

const limit = 20
const outboxPeriodMs = 2_000

@Injectable()
export class OutboxWorker {
  protected readonly periodMs: number = outboxPeriodMs
  private timer: ReturnType<typeof setInterval> | undefined
  private inFlight: Promise<void> | undefined

  constructor(
    private readonly publisher: OutboxPublisher,
    @Inject(CLOCK) private readonly clock: ClockProtocol,
    @Inject(LOGGER) private readonly logger: LoggerProtocol,
  ) {}

  open(): void {
    const started = this.timer !== undefined

    if (started) { return }

    const tick = () => {
      const busy = this.inFlight !== undefined

      if (busy) { return }

      const at = this.clock.now()
      const attempted = this.run(at)
      const settled = attempted.catch(this.fail)
      const finished = settled.then(() => {
        this.inFlight = undefined
      })

      this.inFlight = finished
    }

    this.timer = setInterval(tick, this.periodMs)
  }

  close(): void {
    const stopped = this.timer === undefined

    if (stopped) { return }

    clearInterval(this.timer)
    this.timer = undefined
  }

  private run(at: Date): Promise<unknown> {
    return this.publisher.publish({ at, limit })
  }

  private readonly fail = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)

    this.logger.warn(message)
  }
}
