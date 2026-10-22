import { Module } from '@nestjs/common'
import type { ReadinessProtocol } from '@application/protocols'
import {
  CheckHealthLivenessUseCase,
  CheckHealthReadinessUseCase,
  READINESS,
} from '@application/health'
import { MessagingModule, QueueReadiness } from '@infrastructure/messaging'
import { DatabaseReadiness, PersistenceModule } from '@infrastructure/persistence'
import { HealthController } from './controllers'

const moduleImports = [PersistenceModule, MessagingModule]
const readinessDependencies = [DatabaseReadiness, QueueReadiness]

const joinReadiness = (database: DatabaseReadiness, queue: QueueReadiness): Array<ReadinessProtocol> => [
  database,
  queue,
]

@Module({
  imports: moduleImports,
  controllers: [HealthController],
  providers: [
    CheckHealthLivenessUseCase,
    CheckHealthReadinessUseCase,
    { provide: READINESS, useFactory: joinReadiness, inject: readinessDependencies },
  ],
})
export class HealthModule {}
