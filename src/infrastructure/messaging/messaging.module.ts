import { SQSClient } from '@aws-sdk/client-sqs'
import { Module } from '@nestjs/common'
import { PUBLISHER } from '../../application/tokens'
import { TransactionsModule } from '../../application/transactions'
import { Environment, EnvironmentModule } from '../environment'
import { ObservabilityModule } from '../observability'
import { PersistenceModule } from '../persistence'
import { CONSUMER_NAME, QueueReadiness, SqsConsumer, SqsQueue, WagerConsumer } from './consumers'
import { QUEUE_CONFIG, createQueueConfig, createSqsClient } from './factories'
import { WagerRequestMapper } from './mappers'
import { OutboxPublisher, OutboxWorker, SqsPublisher } from './publishers'

const consumerName = 'wager'

const moduleImports = [EnvironmentModule, ObservabilityModule, PersistenceModule, TransactionsModule]
const moduleExports = [OutboxWorker, SqsConsumer, QueueReadiness]
const clientDependencies = [Environment]

@Module({
  imports: moduleImports,
  providers: [
    WagerRequestMapper,
    { provide: SQSClient, useFactory: createSqsClient, inject: clientDependencies },
    { provide: QUEUE_CONFIG, useFactory: createQueueConfig, inject: clientDependencies },
    { provide: CONSUMER_NAME, useValue: consumerName },
    SqsPublisher,
    { provide: PUBLISHER, useExisting: SqsPublisher },
    OutboxPublisher,
    OutboxWorker,
    SqsQueue,
    WagerConsumer,
    SqsConsumer,
    QueueReadiness,
  ],
  exports: moduleExports,
})
export class MessagingModule {}
