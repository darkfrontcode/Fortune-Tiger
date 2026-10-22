import { SendMessageCommand } from '@aws-sdk/client-sqs'
import type { Published, PublisherProtocol } from '../../../application/protocols'

type SqsClient = {
  send(command: SendMessageCommand): Promise<unknown>
}

export class SqsPublisher implements PublisherProtocol {
  constructor(
    private readonly client: SqsClient,
    private readonly queueUrl: string,
  ) {}

  async publish(published: Published): Promise<void> {
    const { id, aggregateId, payload } = published
    const body = JSON.stringify(payload)
    const input = {
      QueueUrl: this.queueUrl,
      MessageBody: body,
      MessageGroupId: aggregateId,
      MessageDeduplicationId: id,
    }
    const command = new SendMessageCommand(input)

    await this.client.send(command)
  }
}
