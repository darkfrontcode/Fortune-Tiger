import { SQSClient } from '@aws-sdk/client-sqs'
import { Module } from '@nestjs/common'
import { WagersModule } from '@application/wagers'
import { JourneysModule } from '@application/journeys'
import { AuditStoreModule } from '../audit'
import { EnvironmentModule } from '../environment'
import { ObservabilityModule } from '../observability'
import { PersistenceModule } from '../persistence'
import {
  AuditConsumer,
  AuditSqsConsumer,
  SqsConsumer,
  WagerConsumer,
} from './consumers'
import { QueueFactory, SqsFactory } from './factories'
import { AuditEventMapper, WagerRequestMapper } from './mappers'
import { OutboxPublisher, MeasuredPublisher, SqsPublisher } from './publishers'
import { AuditQueue, QueueReadiness, SqsQueue } from './queues'
import { OutboxWorker } from './workers'
import { AUDIT_QUEUE_CONFIG, CONSUMER_NAME, PUBLISHER, PUBLISH_CONFIG, QUEUE_CONFIG } from './tokens'

const consumerName = 'wager'

const moduleImports = [
  EnvironmentModule,
  ObservabilityModule,
  PersistenceModule,
  WagersModule,
  AuditStoreModule,
  JourneysModule,
]
const moduleExports = [OutboxWorker, SqsConsumer, AuditSqsConsumer, QueueReadiness]

@Module({
  imports: moduleImports,
  providers: [
    WagerRequestMapper,
    AuditEventMapper,
    SqsFactory,
    QueueFactory,
    { provide: SQSClient, useFactory: (factory: SqsFactory) => factory.create(), inject: [SqsFactory] },
    { provide: QUEUE_CONFIG, useFactory: (factory: QueueFactory) => factory.create(), inject: [QueueFactory] },
    { provide: PUBLISH_CONFIG, useFactory: (factory: QueueFactory) => factory.publish(), inject: [QueueFactory] },
    { provide: AUDIT_QUEUE_CONFIG, useFactory: (factory: QueueFactory) => factory.audit(), inject: [QueueFactory] },
    { provide: CONSUMER_NAME, useValue: consumerName },
    SqsPublisher,
    { provide: PUBLISHER, useExisting: MeasuredPublisher },
    MeasuredPublisher,
    OutboxPublisher,
    OutboxWorker,
    SqsQueue,
    WagerConsumer,
    SqsConsumer,
    AuditQueue,
    AuditConsumer,
    AuditSqsConsumer,
    QueueReadiness,
  ],
  exports: moduleExports,
})
export class MessagingModule {}
