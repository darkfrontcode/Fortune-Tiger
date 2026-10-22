import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs'
import { Inject, Injectable } from '@nestjs/common'
import type { Published, PublisherProtocol } from '@infrastructure/messaging/publishers'
import type { ConsumerType } from '../consumers'
import { QUEUE_CONFIG } from '../factories'

type SqsClient = {
  send(command: SendMessageCommand): Promise<unknown>
}

@Injectable()
export class SqsPublisher implements PublisherProtocol {
  constructor(
    @Inject(SQSClient) private readonly client: SqsClient,
    @Inject(QUEUE_CONFIG) private readonly config: ConsumerType.Config,
  ) {}

  async publish(published: Published): Promise<void> {
    const { id, aggregateId, payload } = published
    const body = JSON.stringify(payload)
    const queueUrl = this.config.queueUrl
    const input = {
      QueueUrl: queueUrl,
      MessageBody: body,
      MessageGroupId: aggregateId,
      MessageDeduplicationId: id,
    }
    const command = new SendMessageCommand(input)

    await this.client.send(command)
  }
}
