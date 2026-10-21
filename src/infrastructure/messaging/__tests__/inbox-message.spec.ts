import { describe, expect, test } from 'bun:test'
import { InboxMessage } from '../inbox-message'

const instant = {
  received: new Date('2026-01-01T00:00:00.000Z'),
  processed: new Date('2026-01-01T00:00:01.000Z'),
}

const scope = {
  consumer: 'wager-transactions-consumer',
  message: 'message-abc',
  hash: 'payload-hash',
}

describe('InboxMessage', () => {
  test('WHEN receive runs SHOULD store identity and leave processed empty', () => {
    const input = {
      messageId: scope.message,
      consumerName: scope.consumer,
      payloadHash: scope.hash,
      receivedAt: instant.received,
    }

    const message = InboxMessage.receive(input)

    expect(message.messageId).toBe(scope.message)
    expect(message.consumerName).toBe(scope.consumer)
    expect(message.payloadHash).toBe(scope.hash)
    expect(message.receivedAt).toEqual(instant.received)
    expect(message.processedAt).toBeUndefined()
    expect(message.isProcessed()).toBe(false)
  })

  test('WHEN markProcessed runs SHOULD set processedAt', () => {
    const input = {
      messageId: scope.message,
      consumerName: scope.consumer,
      payloadHash: scope.hash,
      receivedAt: instant.received,
    }

    const message = InboxMessage.receive(input)

    message.markProcessed(instant.processed)

    expect(message.processedAt).toEqual(instant.processed)
    expect(message.isProcessed()).toBe(true)
  })

  test('WHEN rehydrate runs SHOULD rebuild without receive', () => {
    const schema = {
      messageId: scope.message,
      consumerName: scope.consumer,
      payloadHash: scope.hash,
      receivedAt: instant.received,
      processedAt: instant.processed,
    }

    const message = InboxMessage.rehydrate(schema)

    expect(message.isProcessed()).toBe(true)
  })
})
