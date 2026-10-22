import { Inject, Injectable } from '@nestjs/common'
import type { ClockProtocol } from '@application/time'
import type { LoggerProtocol } from '@application/observability'
import { RetryReferencesUseCase } from '@application/references/use-cases'
import { CLOCK } from '@application/time'
import { LOGGER } from '@application/observability'

const intervalMs = 2_000
const limit = 20

@Injectable()
export class ReferenceWorker {
  private timer: ReturnType<typeof setInterval> | undefined

  constructor(
    private readonly retryReferences: RetryReferencesUseCase,
    @Inject(CLOCK) private readonly clock: ClockProtocol,
    @Inject(LOGGER) private readonly logger: LoggerProtocol,
  ) {}

  open(): void {
    const started = this.timer !== undefined

    if (started) { return }

    const tick = () => {
      const at = this.clock.now()
      const retried = this.retryReferences.execute({ at, limit })

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
