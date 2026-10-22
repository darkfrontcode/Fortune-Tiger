import { MikroORM } from '@mikro-orm/postgresql'
import { SQSClient } from '@aws-sdk/client-sqs'
import { Module } from '@nestjs/common'
import { ReferenceService } from './application/references'
import { WagerService } from './application/transactions'
import {
  OutboxPublisher,
  OutboxWorker,
  QueueReadiness,
  SqsConsumer,
  SqsPublisher,
  SqsQueue,
  WagerConsumer,
  WagerRequestMapper,
  createQueueConfig,
  createSqsClient,
} from './infrastructure/messaging'
import type { ConsumerType } from './infrastructure/messaging'
import {
  DatabaseReadiness,
  ReferenceReader,
  ReferenceRetryWriter,
  ReferenceWorker,
  WagerSubmitWriter,
  createOrm,
} from './infrastructure/persistence'
import { SimpleLogger, SystemClock } from './infrastructure/observability'
import { HealthController, HealthService } from './presentation/health'
import { RuntimeService } from './runtime.service'

type RuntimeConfig = {
  queue: ConsumerType.Config
  consumerName: string
}

const runtimeToken = Symbol('runtime')
const consumerName = 'wager'
const pretty = process.env.LOG_PRETTY === 'true'
const outboxPublisherDependencies = [MikroORM, SqsPublisher]
const outboxWorkerDependencies = [OutboxPublisher, SystemClock, SimpleLogger]
const referenceServiceDependencies = [ReferenceReader, ReferenceRetryWriter]
const referenceWorkerDependencies = [ReferenceService, SystemClock, SimpleLogger]
const wagerConsumerDependencies = [WagerService, WagerRequestMapper, runtimeToken]
const sqsConsumerDependencies = [SqsQueue, WagerConsumer, SystemClock, SimpleLogger]
const readinessDependencies = [DatabaseReadiness, QueueReadiness]
const runtimeDependencies = [OutboxWorker, ReferenceWorker, SqsConsumer, SimpleLogger]

const createRuntimeConfig = (): RuntimeConfig => ({ queue: createQueueConfig(), consumerName })

const openLogger = (clock: SystemClock): SimpleLogger => SimpleLogger.open({ clock, pretty })

@Module({
  controllers: [HealthController],
  providers: [
    { provide: MikroORM, useFactory: createOrm },
    SystemClock,
    { provide: SimpleLogger, useFactory: openLogger, inject: [SystemClock] },
    { provide: SQSClient, useFactory: createSqsClient },
    { provide: runtimeToken, useFactory: createRuntimeConfig },
    {
      provide: SqsPublisher,
      useFactory: (client: SQSClient, runtime: RuntimeConfig) => new SqsPublisher(client, runtime.queue.queueUrl),
      inject: [SQSClient, runtimeToken],
    },
    {
      provide: OutboxPublisher,
      useFactory: (orm: MikroORM, publisher: SqsPublisher) => new OutboxPublisher(orm, publisher),
      inject: outboxPublisherDependencies,
    },
    {
      provide: OutboxWorker,
      useFactory: (publisher: OutboxPublisher, clock: SystemClock, logger: SimpleLogger) => new OutboxWorker(publisher, clock, logger),
      inject: outboxWorkerDependencies,
    },
    {
      provide: ReferenceReader,
      useFactory: (orm: MikroORM) => new ReferenceReader(orm),
      inject: [MikroORM],
    },
    {
      provide: ReferenceRetryWriter,
      useFactory: (orm: MikroORM) => new ReferenceRetryWriter(orm),
      inject: [MikroORM],
    },
    {
      provide: ReferenceService,
      useFactory: (reader: ReferenceReader, gateway: ReferenceRetryWriter) => new ReferenceService(reader, gateway),
      inject: referenceServiceDependencies,
    },
    {
      provide: ReferenceWorker,
      useFactory: (service: ReferenceService, clock: SystemClock, logger: SimpleLogger) => new ReferenceWorker(service, clock, logger),
      inject: referenceWorkerDependencies,
    },
    {
      provide: WagerSubmitWriter,
      useFactory: (orm: MikroORM) => new WagerSubmitWriter(orm),
      inject: [MikroORM],
    },
    {
      provide: WagerService,
      useFactory: (gateway: WagerSubmitWriter) => new WagerService(gateway),
      inject: [WagerSubmitWriter],
    },
    WagerRequestMapper,
    {
      provide: WagerConsumer,
      useFactory: (service: WagerService, mapper: WagerRequestMapper, runtime: RuntimeConfig) =>
        new WagerConsumer(service, mapper, runtime.consumerName),
      inject: wagerConsumerDependencies,
    },
    {
      provide: SqsQueue,
      useFactory: (client: SQSClient, runtime: RuntimeConfig) => new SqsQueue(client, runtime.queue),
      inject: [SQSClient, runtimeToken],
    },
    {
      provide: SqsConsumer,
      useFactory: (queue: SqsQueue, consumer: WagerConsumer, clock: SystemClock, logger: SimpleLogger) =>
        new SqsConsumer(queue, consumer, clock, logger),
      inject: sqsConsumerDependencies,
    },
    {
      provide: DatabaseReadiness,
      useFactory: (orm: MikroORM) => new DatabaseReadiness(orm),
      inject: [MikroORM],
    },
    {
      provide: QueueReadiness,
      useFactory: (client: SQSClient, runtime: RuntimeConfig) => new QueueReadiness(client, runtime.queue.queueUrl),
      inject: [SQSClient, runtimeToken],
    },
    {
      provide: HealthService,
      useFactory: (database: DatabaseReadiness, queue: QueueReadiness) => new HealthService([database, queue]),
      inject: readinessDependencies,
    },
    {
      provide: RuntimeService,
      useFactory: (outbox: OutboxWorker, reference: ReferenceWorker, consumer: SqsConsumer, logger: SimpleLogger) =>
        new RuntimeService(outbox, reference, consumer, logger),
      inject: runtimeDependencies,
    },
  ],
})
export class AppModule {}
