import { Inject, Injectable } from '@nestjs/common'
import type { ClockProtocol } from '@application/time'
import { CLOCK } from '@application/time'
import type { LoggerProtocol, MetricProtocol } from '@application/observability'
import { LOGGER, METRIC } from '@application/observability'
import { AuditConsumer } from './audit.consumer'
import { AuditQueue } from '../queues/audit.queue'
import { QueueLoop } from '../queues/queue.loop'

@Injectable()
export class AuditSqsConsumer extends QueueLoop {
  constructor(
    queue: AuditQueue,
    consumer: AuditConsumer,
    @Inject(CLOCK) clock: ClockProtocol,
    @Inject(LOGGER) logger: LoggerProtocol,
    @Inject(METRIC) metric: MetricProtocol,
  ) {
    super(queue, consumer, clock, logger, metric)
  }
}
