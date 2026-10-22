import { SQSClient } from '@aws-sdk/client-sqs'
import { MikroORM } from '@mikro-orm/postgresql'
import { Module } from '@nestjs/common'
import { CLOCK, LOGGER, PUBLISHER } from '../../application/tokens'
import type { ClockProtocol, LoggerProtocol, PublisherProtocol } from '../../application/protocols'
import { TransactionsModule, WagerService } from '../../application/transactions'
import { Environment, EnvironmentModule } from '../environment'
import { ObservabilityModule } from '../observability'
import { PersistenceModule } from '../persistence'
import { QueueReadiness, SqsConsumer, SqsQueue, WagerConsumer } from './consumers'
import type { ConsumerType } from './consumers'
import { QUEUE_CONFIG, createQueueConfig, createSqsClient } from './factories'
import { WagerRequestMapper } from './mappers'
import { OutboxPublisher, OutboxWorker, SqsPublisher } from './publishers'

const consumerName = 'wager'

const moduleImports = [EnvironmentModule, ObservabilityModule, PersistenceModule, TransactionsModule]
const moduleExports = [OutboxWorker, SqsConsumer, QueueReadiness]
const clientDependencies = [SQSClient, QUEUE_CONFIG]
const publisherDependencies = [MikroORM, PUBLISHER]
const workerDependencies = [OutboxPublisher, CLOCK, LOGGER]
const wagerConsumerDependencies = [WagerService, WagerRequestMapper]
const consumerDependencies = [SqsQueue, WagerConsumer, CLOCK, LOGGER]

const createPublisher = (client: SQSClient, config: ConsumerType.Config): SqsPublisher =>
  new SqsPublisher(client, config.queueUrl)

const createQueue = (client: SQSClient, config: ConsumerType.Config): SqsQueue => new SqsQueue(client, config)

const createReadiness = (client: SQSClient, config: ConsumerType.Config): QueueReadiness =>
  new QueueReadiness(client, config.queueUrl)

const createOutbox = (orm: MikroORM, publisher: PublisherProtocol): OutboxPublisher =>
  new OutboxPublisher(orm, publisher)

const createWorker = (publisher: OutboxPublisher, clock: ClockProtocol, logger: LoggerProtocol): OutboxWorker =>
  new OutboxWorker(publisher, clock, logger)

const createWagerConsumer = (service: WagerService, mapper: WagerRequestMapper): WagerConsumer =>
  new WagerConsumer(service, mapper, consumerName)

const createConsumer = (
  queue: SqsQueue,
  consumer: WagerConsumer,
  clock: ClockProtocol,
  logger: LoggerProtocol,
): SqsConsumer => new SqsConsumer(queue, consumer, clock, logger)

@Module({
  imports: moduleImports,
  providers: [
    WagerRequestMapper,
    { provide: SQSClient, useFactory: createSqsClient, inject: [Environment] },
    { provide: QUEUE_CONFIG, useFactory: createQueueConfig, inject: [Environment] },
    { provide: SqsPublisher, useFactory: createPublisher, inject: clientDependencies },
    { provide: PUBLISHER, useExisting: SqsPublisher },
    { provide: OutboxPublisher, useFactory: createOutbox, inject: publisherDependencies },
    { provide: OutboxWorker, useFactory: createWorker, inject: workerDependencies },
    { provide: SqsQueue, useFactory: createQueue, inject: clientDependencies },
    { provide: WagerConsumer, useFactory: createWagerConsumer, inject: wagerConsumerDependencies },
    { provide: SqsConsumer, useFactory: createConsumer, inject: consumerDependencies },
    { provide: QueueReadiness, useFactory: createReadiness, inject: clientDependencies },
  ],
  exports: moduleExports,
})
export class MessagingModule {}
