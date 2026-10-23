import { Controller, Get, Header, Inject } from '@nestjs/common'
import { METRIC } from '@application/observability'
import type { MetricProtocol } from '@application/observability'

@Controller()
export class MetricsController {
  constructor(@Inject(METRIC) private readonly metric: MetricProtocol) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  metrics(): Promise<string> {
    return this.metric.render()
  }
}
