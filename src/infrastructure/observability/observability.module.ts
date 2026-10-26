import { Module } from '@nestjs/common'
import type { ClockProtocol } from '@application/time'
import { CLOCK } from '@application/time'
import { LOGGER, METRIC } from '@application/observability'
import type { MetricProtocol } from '@application/observability'
import { Environment, EnvironmentModule } from '../environment'
import { SystemClock } from './clocks'
import { SimpleLogger } from './loggers'
import { PrometheusMetric, SimpleMetric } from './metrics'
import { LoggerService } from './services'

const memoryBackend = 'memory'

const openLogger = (clock: ClockProtocol, environment: Environment): SimpleLogger =>
  SimpleLogger.open({ clock, pretty: environment.pretty })

const openMetric = (environment: Environment): MetricProtocol => {
  const memory = environment.metricsBackend === memoryBackend

  if (memory) { return new SimpleMetric() }

  return new PrometheusMetric()
}

@Module({
  imports: [EnvironmentModule],
  providers: [
    { provide: CLOCK, useClass: SystemClock },
    { provide: LOGGER, useFactory: openLogger, inject: [CLOCK, Environment] },
    { provide: SimpleLogger, useExisting: LOGGER },
    { provide: METRIC, useFactory: openMetric, inject: [Environment] },
    LoggerService,
  ],
  exports: [CLOCK, LOGGER, METRIC, SimpleLogger, LoggerService],
})
export class ObservabilityModule {}
