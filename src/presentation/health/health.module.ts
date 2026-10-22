import { Module } from '@nestjs/common'
import { DatabaseReadiness, PersistenceModule } from '../../infrastructure/persistence'
import { MessagingModule, QueueReadiness } from '../../infrastructure/messaging'
import { HealthController } from './health.controller'
import { HealthService } from './health.service'

const readinessDependencies = [DatabaseReadiness, QueueReadiness]
const moduleImports = [PersistenceModule, MessagingModule]

const createHealthService = (database: DatabaseReadiness, queue: QueueReadiness): HealthService =>
  new HealthService([database, queue])

@Module({
  imports: moduleImports,
  controllers: [HealthController],
  providers: [{ provide: HealthService, useFactory: createHealthService, inject: readinessDependencies }],
})
export class HealthModule {}
