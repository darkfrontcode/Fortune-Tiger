import type { Environment } from '../../environment'
import type { ConsumerType } from '../consumers'
import type { PublisherType } from '../publishers'

const maxMessages = 10
const waitTimeSeconds = 20
const visibilityTimeout = 30

export const QUEUE_CONFIG = Symbol('QueueConfig')

export const AUDIT_QUEUE_CONFIG = Symbol('AuditQueueConfig')

const consumerConfig = (queueUrl: string, deadLetterQueueUrl: string): ConsumerType.Config => ({
  queueUrl,
  deadLetterQueueUrl,
  maxMessages,
  waitTimeSeconds,
  visibilityTimeout,
})

export const createQueueConfig = (environment: Environment): ConsumerType.Config =>
  consumerConfig(environment.queueUrl, environment.deadLetterQueueUrl)

export const createAuditQueueConfig = (environment: Environment): ConsumerType.Config =>
  consumerConfig(environment.eventsQueueUrl, environment.eventsDeadLetterQueueUrl)

export const createPublishConfig = (environment: Environment): PublisherType.Config => ({
  eventsQueueUrl: environment.eventsQueueUrl,
})
