import type { ConsumerType } from '../consumers'

const maxMessages = 10
const waitTimeSeconds = 20
const visibilityTimeout = 30

export const createQueueConfig = (): ConsumerType.Config => ({
  queueUrl: process.env.SQS_QUEUE_URL ?? String(),
  deadLetterQueueUrl: process.env.SQS_DEAD_LETTER_QUEUE_URL ?? String(),
  maxMessages,
  waitTimeSeconds,
  visibilityTimeout,
})
