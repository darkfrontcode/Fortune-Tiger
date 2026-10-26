import { describe, expect, test } from 'bun:test'
import { ReceiveMessageCommand } from '@aws-sdk/client-sqs'
import type { ReceiveMessageCommandOutput, SQSClient } from '@aws-sdk/client-sqs'
import { AuditQueue } from '../audit.queue'
import type { ConsumerType } from '../types'

const config: ConsumerType.Config = {
  queueUrl: 'http://localhost:4566/000000000000/wager-events.fifo',
  deadLetterQueueUrl: 'http://localhost:4566/000000000000/wager-events-dlq.fifo',
  maxMessages: 10,
  waitTimeSeconds: 20,
  visibilityTimeout: 30,
}

class RecordingClient {
  readonly commands = [] as unknown[]

  send(command: unknown): Promise<ReceiveMessageCommandOutput> {
    this.commands.push(command)

    return Promise.resolve({ Messages: [] } as unknown as ReceiveMessageCommandOutput)
  }
}

describe('AuditQueue', () => {
  test('WHEN the audit queue reads SHOULD long-poll the events channel', async () => {
    const client = new RecordingClient()
    const queue = new AuditQueue(client as unknown as SQSClient, config)
    const messages = await queue.receive()
    const command = client.commands[0] as ReceiveMessageCommand

    expect(messages).toEqual([])
    expect(command.input.QueueUrl).toBe(config.queueUrl)
  })
})
