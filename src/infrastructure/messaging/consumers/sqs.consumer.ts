import { Inject, Injectable } from '@nestjs/common'
import type { ClockProtocol } from '@application/time'
import { CLOCK } from '@application/time'
import type { LoggerProtocol, MetricProtocol } from '@application/observability'
import { LOGGER, METRIC } from '@application/observability'
import { QueueLoop } from './queue.loop'
import { SqsQueue } from './sqs.queue'
import { WagerConsumer } from './wager.consumer'

@Injectable()
export class SqsConsumer extends QueueLoop {
  constructor(
    queue: SqsQueue,
    consumer: WagerConsumer,
    @Inject(CLOCK) clock: ClockProtocol,
    @Inject(LOGGER) logger: LoggerProtocol,
    @Inject(METRIC) metric: MetricProtocol,
  ) {
    super(queue, consumer, clock, logger, metric)
  }
}
