import { describe, expect, test } from 'bun:test'
import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
} from '@aws-sdk/client-sqs'
import type { ReceiveMessageCommandOutput, SQSClient } from '@aws-sdk/client-sqs'
import type { ConsumerType } from '../types'
import { SqsQueue } from '../sqs.queue'

const config: ConsumerType.Config = {
  queueUrl: 'http://localhost:4566/000000000000/wager-transactions.fifo',
  deadLetterQueueUrl: 'http://localhost:4566/000000000000/wager-transactions-dlq.fifo',
  maxMessages: 10,
  waitTimeSeconds: 20,
  visibilityTimeout: 30,
}

const identity = {
  messageId: 'msg-123',
  sqsMessageId: 'sqs-1',
  receiptHandle: 'receipt-1',
}

const received = {
  Messages: [
    {
      MessageId: identity.sqsMessageId,
      ReceiptHandle: identity.receiptHandle,
      Body: JSON.stringify({ messageId: identity.messageId }),
      Attributes: {
        ApproximateReceiveCount: '2',
      },
    },
  ],
} as ReceiveMessageCommandOutput

class RecordingClient {
  readonly commands = new Array<unknown>()

  async send(command: unknown): Promise<unknown> {
    this.commands.push(command)

    if (command instanceof ReceiveMessageCommand) { return received }

    return {}
  }
}

const queue = (client: RecordingClient) => new SqsQueue(client as unknown as SQSClient, config)

const message = (): ConsumerType.QueueMessage => ({
  sqsMessageId: identity.sqsMessageId,
  receiptHandle: identity.receiptHandle,
  body: JSON.stringify({ messageId: identity.messageId }),
  receiveCount: 2,
})

describe('SqsQueue', () => {
  test('WHEN the queue receives messages SHOULD map the SQS message', async () => {
    const client = new RecordingClient()
    const output = await queue(client).receive()
    const command = client.commands[0]

    expect(output).toEqual([message()])
    expect(command).toBeInstanceOf(ReceiveMessageCommand)

    if (!(command instanceof ReceiveMessageCommand)) { throw new Error('Expected a receive command') }

    expect(command.input.QueueUrl).toBe(config.queueUrl)
    expect(command.input.MaxNumberOfMessages).toBe(config.maxMessages)
    expect(command.input.WaitTimeSeconds).toBe(config.waitTimeSeconds)
    expect(command.input.VisibilityTimeout).toBe(config.visibilityTimeout)
    expect(command.input.MessageSystemAttributeNames).toEqual(['ApproximateReceiveCount'])
  })

  test('WHEN the message is acked SHOULD delete it', async () => {
    const client = new RecordingClient()
    await queue(client).delete(message())
    const command = client.commands[0]

    if (!(command instanceof DeleteMessageCommand)) { throw new Error('Expected a delete command') }

    expect(command.input.QueueUrl).toBe(config.queueUrl)
    expect(command.input.ReceiptHandle).toBe(identity.receiptHandle)
  })

  test('WHEN the message retries SHOULD change the visibility', async () => {
    const client = new RecordingClient()
    await queue(client).changeVisibility(message(), 4)
    const command = client.commands[0]

    if (!(command instanceof ChangeMessageVisibilityCommand)) { throw new Error('Expected a visibility command') }

    expect(command.input.QueueUrl).toBe(config.queueUrl)
    expect(command.input.ReceiptHandle).toBe(identity.receiptHandle)
    expect(command.input.VisibilityTimeout).toBe(4)
  })

  test('WHEN the message is dead lettered SHOULD keep the fifo identity', async () => {
    const client = new RecordingClient()
    await queue(client).deadLetter(message())
    const command = client.commands[0]

    if (!(command instanceof SendMessageCommand)) { throw new Error('Expected a send command') }

    expect(command.input.QueueUrl).toBe(config.deadLetterQueueUrl)
    expect(command.input.MessageBody).toBe(message().body)
    expect(command.input.MessageGroupId).toBe(identity.messageId)
    expect(command.input.MessageDeduplicationId).toBe(identity.messageId)
  })
})
