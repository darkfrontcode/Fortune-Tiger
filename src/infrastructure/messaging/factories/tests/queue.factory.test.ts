import { afterEach, describe, expect, test } from 'bun:test'
import { Environment } from '../../../environment'
import { QueueFactory } from '../queue.factory'

const variables = [
  'SQS_QUEUE_URL',
  'SQS_DEAD_LETTER_QUEUE_URL',
  'SQS_EVENTS_QUEUE_URL',
  'SQS_EVENTS_DEAD_LETTER_QUEUE_URL',
]

const original: NodeJS.ProcessEnv = { ...process.env }

const restore = (name: string) => {
  const value = original[name]

  if (value === undefined) {
    delete process.env[name]

    return
  }

  process.env[name] = value
}

describe('QueueFactory', () => {
  afterEach(() => {
    variables.forEach(restore)
  })

  test('WHEN the consumer variables are set SHOULD build the consumer config', () => {
    process.env.SQS_QUEUE_URL = 'http://queue'
    process.env.SQS_DEAD_LETTER_QUEUE_URL = 'http://dead'

    const factory = new QueueFactory(new Environment())
    const config = factory.create()

    expect(config).toEqual({
      queueUrl: 'http://queue',
      deadLetterQueueUrl: 'http://dead',
      maxMessages: 10,
      waitTimeSeconds: 20,
      visibilityTimeout: 30,
    })
  })

  test('WHEN the events variable is set SHOULD publish to the events queue', () => {
    process.env.SQS_QUEUE_URL = 'http://queue'
    process.env.SQS_EVENTS_QUEUE_URL = 'http://events'

    const environment = new Environment()
    const config = new QueueFactory(environment).publish()

    expect(config).toEqual({ eventsQueueUrl: 'http://events' })
    expect(config.eventsQueueUrl).not.toBe(environment.queueUrl)
  })

  test('WHEN the events dead letter variable is set SHOULD read the events channel', () => {
    process.env.SQS_EVENTS_QUEUE_URL = 'http://events'
    process.env.SQS_EVENTS_DEAD_LETTER_QUEUE_URL = 'http://events-dead'

    const factory = new QueueFactory(new Environment())
    const config = factory.audit()

    expect(config).toEqual({
      queueUrl: 'http://events',
      deadLetterQueueUrl: 'http://events-dead',
      maxMessages: 10,
      waitTimeSeconds: 20,
      visibilityTimeout: 30,
    })
  })
})
