import { Module } from '@nestjs/common'
import type { ReadinessProtocol } from '@application/health'
import {
  CheckHealthLivenessUseCase,
  CheckHealthReadinessUseCase,
  READINESS,
} from '@application/health'
import { MessagingModule, QueueReadiness } from '@infrastructure/messaging'
import { ObservabilityModule } from '@infrastructure/observability'
import { DatabaseReadiness, PersistenceModule } from '@infrastructure/persistence'
import { HealthController, MetricsController } from './controllers'

const moduleImports = [PersistenceModule, MessagingModule, ObservabilityModule]
const readinessDependencies = [DatabaseReadiness, QueueReadiness]

const joinReadiness = (database: DatabaseReadiness, queue: QueueReadiness): Array<ReadinessProtocol> => [
  database,
  queue,
]

@Module({
  imports: moduleImports,
  controllers: [HealthController, MetricsController],
  providers: [
    CheckHealthLivenessUseCase,
    CheckHealthReadinessUseCase,
    { provide: READINESS, useFactory: joinReadiness, inject: readinessDependencies },
  ],
})
export class HealthModule {}
