import type { ClockProtocol, LoggerProtocol } from '../../../application/protocols'
import { ReferenceService } from '../../../application/references'

const intervalMs = 2_000
const limit = 20

export class ReferenceWorker {
  private timer: ReturnType<typeof setInterval> | undefined

  constructor(
    private readonly service: ReferenceService,
    private readonly clock: ClockProtocol,
    private readonly logger: LoggerProtocol,
  ) {}

  open(): void {
    const started = this.timer !== undefined

    if (started) { return }

    const tick = () => {
      const at = this.clock.now()
      const retried = this.service.retry({ at, limit })

      retried.catch(this.fail)
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
