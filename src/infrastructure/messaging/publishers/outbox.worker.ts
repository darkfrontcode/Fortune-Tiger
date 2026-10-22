import type { ClockProtocol, LoggerProtocol } from '../../../application/protocols'
import type { OutboxPublisher } from './outbox.publisher'

const intervalMs = 2_000
const limit = 20

export class OutboxWorker {
  private timer: ReturnType<typeof setInterval> | undefined

  constructor(
    private readonly publisher: OutboxPublisher,
    private readonly clock: ClockProtocol,
    private readonly logger: LoggerProtocol,
  ) {}

  open(): void {
    const started = this.timer !== undefined

    if (started) { return }

    const tick = () => {
      const at = this.clock.now()
      const batch = this.publisher.publish({ at, limit })

      batch.catch(this.fail)
    }

    this.timer = setInterval(tick, intervalMs)
  }

  close(): void {
    const stopped = this.timer === undefined

    if (stopped) { return }

    clearInterval(this.timer)
    this.timer = undefined
  }

  private readonly fail = (error: Error) => {
    const message = error.message

    this.logger.warn(message)
  }
}
