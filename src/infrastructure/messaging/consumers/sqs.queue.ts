import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs'
import type { Message } from '@aws-sdk/client-sqs'
import { Inject, Injectable } from '@nestjs/common'
import { QUEUE_CONFIG } from '../factories'
import type { ConsumerType } from './types'

type Config = ConsumerType.Config
type QueueMessage = ConsumerType.QueueMessage
type Content = {
  messageId?: unknown
}

const none = 0
const first = 1

const content = (value: unknown): value is Content =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const receiveCount = (attributes: Message['Attributes']): number => {
  const value = attributes?.ApproximateReceiveCount

  if (value === undefined) { return first }

  const parsed = Number(value)
  const invalid = Number.isNaN(parsed)

  if (invalid) { return first }

  return parsed
}

const identity = (body: string, fallback: string): string => {
  try {
    const parsed: unknown = JSON.parse(body)

    if (!content(parsed)) { return fallback }

    const value = parsed.messageId
    const text = typeof value === 'string' && value.length > none

    if (!text) { return fallback }

    return value
  } catch {
    return fallback
  }
}

const message = (source: Message): QueueMessage | undefined => {
  const receiptHandle = source.ReceiptHandle
  const body = source.Body
  const missing = receiptHandle === undefined || body === undefined

  if (missing) { return undefined }

  return {
    sqsMessageId: source.MessageId ?? String(),
    receiptHandle,
    body,
    receiveCount: receiveCount(source.Attributes),
  }
}

@Injectable()
export class SqsQueue {
  constructor(
    @Inject(SQSClient) private readonly client: SQSClient,
    @Inject(QUEUE_CONFIG) private readonly config: Config,
  ) {}

  async receive(signal?: AbortSignal): Promise<Array<QueueMessage>> {
    const command = new ReceiveMessageCommand({
      QueueUrl: this.config.queueUrl,
      MaxNumberOfMessages: this.config.maxMessages,
      WaitTimeSeconds: this.config.waitTimeSeconds,
      VisibilityTimeout: this.config.visibilityTimeout,
      MessageSystemAttributeNames: ['ApproximateReceiveCount'],
    })

    const output = await this.client.send(command, { abortSignal: signal })
    const messages = output.Messages ?? []

    return messages.flatMap((source) => {
      const mapped = message(source)
      const empty = mapped === undefined

      if (empty) { return [] }

      return [mapped]
    })
  }

  async delete(message: QueueMessage): Promise<void> {
    const command = new DeleteMessageCommand({
      QueueUrl: this.config.queueUrl,
      ReceiptHandle: message.receiptHandle,
    })

    await this.client.send(command)
  }

  async changeVisibility(message: QueueMessage, delaySeconds: number): Promise<void> {
    const command = new ChangeMessageVisibilityCommand({
      QueueUrl: this.config.queueUrl,
      ReceiptHandle: message.receiptHandle,
      VisibilityTimeout: delaySeconds,
    })

    await this.client.send(command)
  }

  async deadLetter(message: QueueMessage): Promise<void> {
    const id = identity(message.body, message.sqsMessageId)

    const command = new SendMessageCommand({
      QueueUrl: this.config.deadLetterQueueUrl,
      MessageBody: message.body,
      MessageGroupId: id,
      MessageDeduplicationId: id,
    })

    await this.client.send(command)
  }
}
