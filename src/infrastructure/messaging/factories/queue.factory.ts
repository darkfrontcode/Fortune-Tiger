import type { Environment } from '../../environment'
import type { ConsumerType } from '../consumers'

const maxMessages = 10
const waitTimeSeconds = 20
const visibilityTimeout = 30

export const QUEUE_CONFIG = Symbol('QueueConfig')

export const createQueueConfig = (environment: Environment): ConsumerType.Config => ({
  queueUrl: environment.queueUrl,
  deadLetterQueueUrl: environment.deadLetterQueueUrl,
  maxMessages,
  waitTimeSeconds,
  visibilityTimeout,
})
