import { Inject, Injectable } from '@nestjs/common'
import { uuidv7 } from 'uuidv7'
import { metricNames, METRIC } from '@application/observability'
import type { LoggerProtocol, MetricProtocol } from '@application/observability'
import { LOGGER } from '@application/observability'
import type { ClockProtocol } from '@application/time'
import { CLOCK } from '@application/time'
import { JOURNEY_STORE_FAILURE_MESSAGE } from '../data'
import type { JourneyStoreProtocol } from '../protocols'
import { JOURNEY_STORE } from '../tokens'
import type { JourneyType } from '../types'

const noElapsed = 0

@Injectable()
export class JourneyService {
  constructor(
    @Inject(JOURNEY_STORE) private readonly store: JourneyStoreProtocol,
    @Inject(CLOCK) private readonly clock: ClockProtocol,
    @Inject(LOGGER) private readonly logger: LoggerProtocol,
    @Inject(METRIC) private readonly metric: MetricProtocol,
  ) {}

  async record(input: JourneyType.Input): Promise<void> {
    try {
      await this.store.record(this.step(input))
      this.metric.increment(metricNames.journeyRecorded)
    } catch {
      this.metric.increment(metricNames.journeyFailure)
      this.logger.warn(JOURNEY_STORE_FAILURE_MESSAGE)
    }
  }

  private step(input: JourneyType.Input): JourneyType.Schema {
    const settledAt = this.clock.now()
    const elapsed = settledAt.getTime() - input.startedAt.getTime()

    return {
      stepId: uuidv7(),
      flowId: input.flowId,
      stage: input.stage,
      operation: input.operation,
      outcome: input.outcome,
      occurredAt: input.startedAt,
      durationMs: Math.max(elapsed, noElapsed),
      providerId: input.providerId,
      playerId: input.playerId,
      wagerId: input.wagerId,
      walletId: input.walletId,
      failureCode: input.failureCode,
    }
  }
}
