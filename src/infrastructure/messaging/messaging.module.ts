import { SQSClient } from '@aws-sdk/client-sqs'
import { Module } from '@nestjs/common'
import { WagersModule } from '@application/wagers'
import { JourneysModule } from '@application/journeys'
import { AuditStoreModule } from '../audit'
import { Environment, EnvironmentModule } from '../environment'
import { ObservabilityModule } from '../observability'
import { PersistenceModule } from '../persistence'
import {
  AuditConsumer,
  AuditQueue,
  AuditSqsConsumer,
  CONSUMER_NAME,
  QueueReadiness,
  SqsConsumer,
  SqsQueue,
  WagerConsumer,
} from './consumers'
import {
  AUDIT_QUEUE_CONFIG,
  QUEUE_CONFIG,
  createAuditQueueConfig,
  createPublishConfig,
  createQueueConfig,
  createSqsClient,
} from './factories'
import { AuditEventMapper, WagerRequestMapper } from './mappers'
import { OutboxPublisher, OutboxWorker, SqsPublisher } from './publishers'
import { PUBLISHER, PUBLISH_CONFIG } from './tokens'

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
const clientDependencies = [Environment]

@Module({
  imports: moduleImports,
  providers: [
    WagerRequestMapper,
    AuditEventMapper,
    { provide: SQSClient, useFactory: createSqsClient, inject: clientDependencies },
    { provide: QUEUE_CONFIG, useFactory: createQueueConfig, inject: clientDependencies },
    { provide: PUBLISH_CONFIG, useFactory: createPublishConfig, inject: clientDependencies },
    { provide: AUDIT_QUEUE_CONFIG, useFactory: createAuditQueueConfig, inject: clientDependencies },
    { provide: CONSUMER_NAME, useValue: consumerName },
    SqsPublisher,
    { provide: PUBLISHER, useExisting: SqsPublisher },
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
