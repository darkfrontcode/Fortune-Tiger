export namespace ConsumerType {
  export type QueueMessage = {
    sqsMessageId: string
    receiptHandle: string
    body: string
    receiveCount: number
  }

  export type Config = {
    queueUrl: string
    deadLetterQueueUrl: string
    maxMessages: number
    waitTimeSeconds: number
    visibilityTimeout: number
  }

  export type ConsumeInput = {
    message: QueueMessage
    at: Date
  }
}
