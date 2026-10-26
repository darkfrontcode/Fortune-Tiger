import { Injectable } from '@nestjs/common'
import type { Environment } from '../../environment'
import type { FactoryProtocol } from '../../protocols'
import type { PublisherType } from '../publishers'
import type { ConsumerType } from '../queues'

const maxMessages = 10
const waitTimeSeconds = 20
const visibilityTimeout = 30

@Injectable()
export class QueueFactory implements FactoryProtocol<ConsumerType.Config> {
  constructor(private readonly environment: Environment) {}

  create(): ConsumerType.Config {
    return this.config(this.environment.queueUrl, this.environment.deadLetterQueueUrl)
  }

  audit(): ConsumerType.Config {
    return this.config(this.environment.eventsQueueUrl, this.environment.eventsDeadLetterQueueUrl)
  }

  publish(): PublisherType.Config {
    return { eventsQueueUrl: this.environment.eventsQueueUrl }
  }

  private config(queueUrl: string, deadLetterQueueUrl: string): ConsumerType.Config {
    return {
      queueUrl,
      deadLetterQueueUrl,
      maxMessages,
      waitTimeSeconds,
      visibilityTimeout,
    }
  }
}
