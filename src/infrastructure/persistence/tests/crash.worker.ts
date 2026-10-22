import { SQSClient } from '@aws-sdk/client-sqs'
import type { ClockProtocol, LoggerProtocol } from '@application/protocols'
import { IdempotencyService } from '@application/idempotencies'
import { WagerMediator } from '@application/transactions/wager/mediators'
import { WagerService } from '@application/transactions'
import { WagerEventsMapper, WagerRequestMapper } from '../../messaging/mappers'
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
  )
  const service = new WagerService(writer, idempotency)
  const mapper = new WagerRequestMapper()
  const wager = new WagerConsumer(service, mapper, consumerName)
  const clock: ClockProtocol = { now: () => new Date(receivedAt) }
  const logger: LoggerProtocol = { warn: () => undefined }
  const client = new SQSClient({ region })
  const queue = new AckBarrier(client, queueConfig)
  const consumer = new SqsConsumer(queue, wager, clock, logger)
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
