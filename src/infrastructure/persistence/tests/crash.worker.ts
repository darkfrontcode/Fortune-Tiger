import { SQSClient } from '@aws-sdk/client-sqs'
import type { ClockProtocol } from '@application/time'
import type { LoggerProtocol } from '@application/observability'
import { IdempotencyService } from '@application/idempotencies'
import { WagerMediator } from '@application/wagers/mediators'
import { SubmitWagerUseCase } from '@application/wagers/use-cases'
import { WagerEventsMapper, WagerRequestMapper } from '../../messaging/mappers'
import { SimpleMetric, SystemClock } from '../../observability'
import { SqsConsumer, SqsQueue, WagerConsumer } from '../../messaging/consumers'
import type { ConsumerType } from '../../messaging/consumers'
import { createOrm } from '..'
import { WagerSubmitWriter } from '../wager'

const empty = String()
const region = 'us-east-1'
const maxMessages = 1
const waitTimeSeconds = 0
const visibilityTimeout = 30
const queueConfig = {
  queueUrl: empty,
  deadLetterQueueUrl: empty,
  maxMessages,
  waitTimeSeconds,
  visibilityTimeout,
}
const consumerName = 'wager'
const signal = 'ACK_PENDING\n'
const unexpected = 'UNEXPECTED_SETTLEMENT\n'

class AckBarrier extends SqsQueue {
  async delete(): Promise<void> {
    const written = new Promise<void>((resolve) => {
      process.stdout.write(signal, () => resolve())
    })

    await written
    await new Promise<void>(() => {})
  }

  async changeVisibility(): Promise<void> {
    process.stdout.write(unexpected)
  }

  async deadLetter(): Promise<void> {
    process.stdout.write(unexpected)
  }
}

const run = async (): Promise<void> => {
  const [, , body, receivedAt, sqsMessageId, receiptHandle, receiveCountValue] = process.argv

  if (
    body === undefined
    || receivedAt === undefined
    || sqsMessageId === undefined
    || receiptHandle === undefined
    || receiveCountValue === undefined
  ) {
    throw new Error('The crash worker needs a complete queue message')
  }

  const receiveCount = Number(receiveCountValue)
  const orm = await createOrm(undefined, true)
  const idempotency = new IdempotencyService()
  const writer = new WagerSubmitWriter(
    orm,
    idempotency,
    new WagerEventsMapper(),
    new WagerMediator(),
    new SimpleMetric(),
  )
  const useCase = new SubmitWagerUseCase(writer, idempotency, new SimpleMetric(), new SystemClock())
  const mapper = new WagerRequestMapper()
  const wager = new WagerConsumer(useCase, mapper, consumerName)
  const clock: ClockProtocol = { now: () => new Date(receivedAt) }
  const logger: LoggerProtocol = { warn: () => undefined }
  const client = new SQSClient({ region })
  const queue = new AckBarrier(client, queueConfig)
  const consumer = new SqsConsumer(queue, wager, clock, logger, new SimpleMetric())
  const message: ConsumerType.QueueMessage = {
    sqsMessageId,
    receiptHandle,
    body,
    receiveCount,
  }

  await consumer.consume(message)
  await orm.close(true)
  process.stdout.write(unexpected)
}

await run()
