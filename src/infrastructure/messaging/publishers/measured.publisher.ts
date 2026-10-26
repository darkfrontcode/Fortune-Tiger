import { Inject, Injectable } from '@nestjs/common'
import { metricNames, METRIC } from '@application/observability'
import type { MetricProtocol } from '@application/observability'
import type { ClockProtocol } from '@application/time'
import { CLOCK } from '@application/time'
import { SqsPublisher } from './sqs.publisher'
import type { PublisherProtocol, Published } from '../protocols/publisher.protocol'

@Injectable()
export class MeasuredPublisher implements PublisherProtocol {
  constructor(
    private readonly inner: SqsPublisher,
    @Inject(METRIC) private readonly metric: MetricProtocol,
    @Inject(CLOCK) private readonly clock: ClockProtocol,
  ) {}

  async publish(published: Published): Promise<void> {
    const started = this.clock.now()
    const inner = this.inner

    await inner.publish(published)

    const ended = this.clock.now().getTime()
    const elapsed = Math.max(ended - started.getTime(), 0)

    this.metric.increment(metricNames.publishCount)
    this.metric.observe(metricNames.publishDuration, elapsed)
  }
}
