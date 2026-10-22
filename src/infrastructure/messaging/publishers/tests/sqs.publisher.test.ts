import { describe, expect, test } from 'bun:test'
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs'
import type { ConsumerType } from '../../consumers'
import { SqsPublisher } from '../sqs.publisher'

const config: ConsumerType.Config = {
  queueUrl: 'http://localhost:4566/000000000000/wager-transactions.fifo',
  deadLetterQueueUrl: 'http://localhost:4566/000000000000/wager-transactions-dlq.fifo',
  maxMessages: 10,
  waitTimeSeconds: 20,
  visibilityTimeout: 30,
}

const aws = {
  region: 'us-east-1',
}

const event = {
  id: '0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1',
  aggregateId: '0192f291-27dd-7d3f-8071-5f8685deef37',
  payload: {
    eventId: '0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1',
    eventType: 'WagerTransactionProcessed',
  },
}

class RecordingClient {
  readonly commands = new Array<SendMessageCommand>()

  async send(command: SendMessageCommand): Promise<unknown> {
    this.commands.push(command)

    return {}
  }
}

describe('SqsPublisher', () => {
  test('WHEN the SDK client is injected SHOULD build the adapter', () => {
    const client = new SQSClient({ region: aws.region })
    const publisher = new SqsPublisher(client, config)

    expect(publisher).toBeInstanceOf(SqsPublisher)
  })

  test('WHEN publishing SHOULD send a FIFO message with the aggregate and the event', async () => {
    const client = new RecordingClient()
    const publisher = new SqsPublisher(client, config)

    await publisher.publish(event)

    const [command] = client.commands

    expect(client.commands).toHaveLength(1)
    expect(command?.input).toEqual({
      QueueUrl: config.queueUrl,
      MessageBody: JSON.stringify(event.payload),
      MessageGroupId: event.aggregateId,
      MessageDeduplicationId: event.id,
    })
  })
})
