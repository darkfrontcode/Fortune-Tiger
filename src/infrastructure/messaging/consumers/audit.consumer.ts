import { Inject, Injectable } from '@nestjs/common'
import type { ClockProtocol } from '@application/time'
import { CLOCK } from '@application/time'
import { AuditOutcome } from '@application/audits'
import type { AuditStoreProtocol, AuditType } from '@application/audits'
import { AUDIT_STORE } from '@application/audits/tokens'
import { metricNames } from '@application/observability'
import type { LoggerProtocol, MetricProtocol } from '@application/observability'
import { LOGGER, METRIC } from '@application/observability'
import { AuditEventMapper } from '../mappers'
import { AUDIT_STORE_FAILURE_MESSAGE, INVALID_AUDIT_EVENT_MESSAGE } from '../messages'
import type { ConsumerProtocol } from './consumer.protocol'
import { ConsumerOutcome } from './enums'
import type { ConsumerType } from './types'

const maxAttempts = 5

@Injectable()
export class AuditConsumer implements ConsumerProtocol {
  constructor(
    private readonly mapper: AuditEventMapper,
    @Inject(AUDIT_STORE) private readonly store: AuditStoreProtocol,
    @Inject(CLOCK) private readonly clock: ClockProtocol,
    @Inject(LOGGER) private readonly logger: LoggerProtocol,
    @Inject(METRIC) private readonly metric: MetricProtocol,
  ) {}

  async consume(input: ConsumerType.ConsumeInput): Promise<ConsumerOutcome> {
    const { message } = input
    const event = this.event(message.body)

    if (event === undefined) { return ConsumerOutcome.DEAD_LETTER }

    return this.persist(event, message.receiveCount)
  }

  private event(body: string): AuditType.Event | undefined {
    const recordedAt = this.clock.now()

    try {
      return this.mapper.map({ body, recordedAt })
    } catch {
      this.logger.warn(INVALID_AUDIT_EVENT_MESSAGE)

      return undefined
    }
  }

  private async persist(event: AuditType.Event, receiveCount: number): Promise<ConsumerOutcome> {
    try {
      const outcome = await this.store.record(event)
      const duplicate = outcome === AuditOutcome.DUPLICATE
      const name = duplicate ? metricNames.auditDuplicate : metricNames.auditPersisted

      this.metric.increment(name)

      return ConsumerOutcome.ACK
    } catch {
      this.metric.increment(metricNames.auditFailure)
      this.logger.warn(AUDIT_STORE_FAILURE_MESSAGE)

      const exhausted = receiveCount >= maxAttempts

      return exhausted ? ConsumerOutcome.DEAD_LETTER : ConsumerOutcome.RETRY
    }
  }
}
