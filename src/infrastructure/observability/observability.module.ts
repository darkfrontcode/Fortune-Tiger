import { Module } from '@nestjs/common'
import { CLOCK, LOGGER } from '../../application/tokens'
import type { ClockProtocol } from '../../application/protocols'
import { Environment, EnvironmentModule } from '../environment'
import { SimpleLogger } from './simple-logger'
import { SystemClock } from './system-clock'

const openLogger = (clock: ClockProtocol, environment: Environment): SimpleLogger =>
  SimpleLogger.open({ clock, pretty: environment.pretty })

@Module({
  imports: [EnvironmentModule],
  providers: [
    { provide: CLOCK, useClass: SystemClock },
    { provide: LOGGER, useFactory: openLogger, inject: [CLOCK, Environment] },
  ],
  exports: [CLOCK, LOGGER],
})
export class ObservabilityModule {}
