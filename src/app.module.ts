import { Module } from '@nestjs/common'
import { CLOCK, LOGGER } from './application/tokens'
import type { ClockProtocol, LoggerProtocol } from './application/protocols'
import { ReferenceService, ReferencesModule } from './application/references'
import { TransactionsModule } from './application/transactions'
import { MessagingModule, OutboxWorker, SqsConsumer } from './infrastructure/messaging'
import { ObservabilityModule } from './infrastructure/observability'
import { PersistenceModule, ReferenceWorker } from './infrastructure/persistence'
import { HealthModule } from './presentation/health'
import { RuntimeService } from './runtime.service'

const referenceWorkerDependencies = [ReferenceService, CLOCK, LOGGER]
const runtimeDependencies = [OutboxWorker, ReferenceWorker, SqsConsumer, LOGGER]

const createReferenceWorker = (
  service: ReferenceService,
  clock: ClockProtocol,
  logger: LoggerProtocol,
): ReferenceWorker => new ReferenceWorker(service, clock, logger)

const createRuntime = (
  outbox: OutboxWorker,
  reference: ReferenceWorker,
  consumer: SqsConsumer,
  logger: LoggerProtocol,
): RuntimeService => new RuntimeService(outbox, reference, consumer, logger)

@Module({
  imports: [
    ObservabilityModule,
    PersistenceModule,
    TransactionsModule,
    ReferencesModule,
    MessagingModule,
    HealthModule,
  ],
  providers: [
    { provide: ReferenceWorker, useFactory: createReferenceWorker, inject: referenceWorkerDependencies },
    { provide: RuntimeService, useFactory: createRuntime, inject: runtimeDependencies },
  ],
})
export class AppModule {}
