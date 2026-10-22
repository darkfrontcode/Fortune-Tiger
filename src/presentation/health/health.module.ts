import { Module } from '@nestjs/common'
import type { ReadinessProtocol } from '@application/protocols'
import { READINESS } from './tokens'
import { MessagingModule, QueueReadiness } from '@infrastructure/messaging'
import { DatabaseReadiness, PersistenceModule } from '@infrastructure/persistence'
import { HealthController } from './controllers'
import { HealthService } from './services'

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
    HealthService,
    { provide: READINESS, useFactory: joinReadiness, inject: readinessDependencies },
  ],
})
export class HealthModule {}
