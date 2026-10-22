import { Inject, Injectable } from '@nestjs/common'
import type { ClockProtocol, LoggerProtocol } from '../../../application/protocols'
import { ReferenceService } from '../../../application/references/reference.service'
import { CLOCK, LOGGER } from '../../../application/tokens'

const intervalMs = 2_000
const limit = 20

@Injectable()
export class ReferenceWorker {
  private timer: ReturnType<typeof setInterval> | undefined

  constructor(
    private readonly service: ReferenceService,
    @Inject(CLOCK) private readonly clock: ClockProtocol,
    @Inject(LOGGER) private readonly logger: LoggerProtocol,
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
