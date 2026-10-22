import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import type { MikroORM } from '@mikro-orm/postgresql'
import { uuidv7 } from 'uuidv7'
import type { Published, PublisherProtocol } from '@infrastructure/messaging/publishers'
import { OutboxMessage } from '../../messaging/messages'
import { OutboxPublisher } from '../../messaging/publishers/outbox.publisher'
import { OutboxMessageEntity } from '../outbox'
import { OutboxMessageRepository } from '../outbox'
import { PersistenceHarness } from './persistence.harness'

const instant = {
  open: new Date('2026-01-01T00:00:00.000Z'),
}

const event = {
  type: 'WagerTransactionProcessed',
}

const failure = {
  message: 'SQS unavailable',
}

const EMPTY = 0
const FIRST_RETRY_MS = 1_000
const LIMIT = 20

type MessageInput = {
  at: Date
  occurredAt?: Date
  nextAttemptAt?: Date
  publishedAt?: Date
}

const createMessage = (input: MessageInput): OutboxMessage => {
  const id = uuidv7()
  const aggregateId = uuidv7()
  const occurredAt = input.occurredAt ?? input.at
  const payload = { eventId: id, eventType: event.type }
  const schema = {
    id,
    aggregateId,
    eventType: event.type,
    payload,
    occurredAt,
    attempts: EMPTY,
    nextAttemptAt: input.nextAttemptAt,
    publishedAt: input.publishedAt,
  }

  return OutboxMessage.rehydrate(schema)
}

class RecordingPublisher implements PublisherProtocol {
  readonly published = new Array<Published>()

  async publish(published: Published): Promise<void> {
    this.published.push(published)
  }
}

class FailingPublisher implements PublisherProtocol {
  async publish(): Promise<void> {
    throw new Error(failure.message)
  }
}

const orm: MikroORM = await PersistenceHarness.open()

const seed = async (messages: Array<OutboxMessage>): Promise<void> => {
  await orm.em.transactional(async (manager) => {
    const outbox = new OutboxMessageRepository(manager)

    outbox.saveMany(messages)
  })
}

const findStored = async (id: string): Promise<OutboxMessageEntity | null> => {
  orm.em.clear()

  return orm.em.findOne(OutboxMessageEntity, id)
}

describe('OutboxPublisher', () => {
  beforeEach(async () => {
    await PersistenceHarness.reset(orm)
  })

  afterAll(async () => {
    await PersistenceHarness.close(orm)
  })

  test('WHEN a row is due SHOULD publish it and mark it published', async () => {
    const message = createMessage({ at: instant.open })

    await seed([message])

    const publisher = new RecordingPublisher()
    const service = new OutboxPublisher(orm, publisher)
    const report = await service.publish({ at: instant.open, limit: LIMIT })
    const stored = await findStored(message.id)
    const toId = (published: Published) => published.id

    expect(report).toEqual({ published: 1, retried: EMPTY })
    expect(publisher.published.map(toId)).toEqual([message.id])
    expect(stored?.publishedAt).toEqual(instant.open)
    expect(stored?.attempts).toBe(EMPTY)
  })

  test('WHEN a row is rehydrated SHOULD treat a null column as absent', async () => {
    const message = createMessage({ at: instant.open })

    await seed([message])

    await orm.em.transactional(async (manager) => {
      const outbox = new OutboxMessageRepository(manager)
      const [due] = await outbox.findDueForUpdate(instant.open, LIMIT)

      expect(due?.isPending()).toBe(true)
      expect(due?.isDue(instant.open)).toBe(true)
    })
  })

  test('WHEN the next attempt is in the future SHOULD skip the row', async () => {
    const retryAt = new Date(instant.open.getTime() + FIRST_RETRY_MS)
    const message = createMessage({ at: instant.open, nextAttemptAt: retryAt })

    await seed([message])

    const publisher = new RecordingPublisher()
    const service = new OutboxPublisher(orm, publisher)
    const report = await service.publish({ at: instant.open, limit: LIMIT })
    const stored = await findStored(message.id)

    expect(report).toEqual({ published: EMPTY, retried: EMPTY })
    expect(publisher.published).toHaveLength(EMPTY)
    expect(stored?.publishedAt).toBeNull()
    expect(stored?.attempts).toBe(EMPTY)
  })

  test('WHEN the publish fails SHOULD schedule a retry and keep the row pending', async () => {
    const message = createMessage({ at: instant.open })

    await seed([message])

    const service = new OutboxPublisher(orm, new FailingPublisher())
    const report = await service.publish({ at: instant.open, limit: LIMIT })
    const stored = await findStored(message.id)
    const expected = new Date(instant.open.getTime() + FIRST_RETRY_MS)

    expect(report).toEqual({ published: EMPTY, retried: 1 })
    expect(stored?.publishedAt).toBeNull()
    expect(stored?.attempts).toBe(1)
    expect(stored?.nextAttemptAt).toEqual(expected)
  })

  test('WHEN the row was published SHOULD not select it again', async () => {
    const message = createMessage({ at: instant.open, publishedAt: instant.open })

    await seed([message])

    const publisher = new RecordingPublisher()
    const service = new OutboxPublisher(orm, publisher)
    const report = await service.publish({ at: instant.open, limit: LIMIT })

    expect(report).toEqual({ published: EMPTY, retried: EMPTY })
    expect(publisher.published).toHaveLength(EMPTY)
  })

  test('WHEN several rows are due SHOULD publish the oldest first', async () => {
    const after = new Date(instant.open.getTime() + FIRST_RETRY_MS)
    const messageAfter = createMessage({ at: instant.open, occurredAt: after })
    const messageAtStart = createMessage({ at: instant.open })

    await seed([messageAfter, messageAtStart])

    const publisher = new RecordingPublisher()
    const service = new OutboxPublisher(orm, publisher)

    await service.publish({ at: instant.open, limit: 1 })

    const toId = (published: Published) => published.id

    expect(publisher.published.map(toId)).toEqual([messageAtStart.id])
  })

  test('WHEN two publishers run together SHOULD publish each row once', async () => {
    const messageOne = createMessage({ at: instant.open })
    const messageTwo = createMessage({ at: instant.open })

    await seed([messageOne, messageTwo])

    const publisher = new RecordingPublisher()
    const service = new OutboxPublisher(orm, publisher)
    const firstBatch = service.publish({ at: instant.open, limit: 1 })
    const secondBatch = service.publish({ at: instant.open, limit: 1 })
    const reports = await Promise.all([firstBatch, secondBatch])
    const total = reports.reduce((sum, report) => sum + report.published, EMPTY)
    const toId = (published: Published) => published.id
    const ids = publisher.published.map(toId)

    expect(total).toBe(2)
    expect(new Set(ids).size).toBe(2)
  })
})
