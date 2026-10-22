import { Module } from '@nestjs/common'
import type { ClockProtocol } from '@application/time'
import { CLOCK } from '@application/time'
import { LOGGER, METRIC } from '@application/observability'
import { Environment, EnvironmentModule } from '../environment'
import { LoggerService } from './logger.service'
import { SimpleLogger } from './simple-logger'
import { SimpleMetric } from './simple.metric'
import { SystemClock } from './system-clock'

const openLogger = (clock: ClockProtocol, environment: Environment): SimpleLogger =>
  SimpleLogger.open({ clock, pretty: environment.pretty })

@Module({
  imports: [EnvironmentModule],
  providers: [
    { provide: CLOCK, useClass: SystemClock },
    { provide: LOGGER, useFactory: openLogger, inject: [CLOCK, Environment] },
    { provide: SimpleLogger, useExisting: LOGGER },
    { provide: METRIC, useClass: SimpleMetric },
    LoggerService,
  ],
  exports: [CLOCK, LOGGER, METRIC, SimpleLogger, LoggerService],
})
export class ObservabilityModule {}
