import { afterEach, describe, expect, test } from 'bun:test'
import { Environment } from '../../../environment'
import { createPublishConfig, createQueueConfig } from '../queue.factory'

const variables = ['SQS_QUEUE_URL', 'SQS_DEAD_LETTER_QUEUE_URL', 'SQS_EVENTS_QUEUE_URL']

const original: NodeJS.ProcessEnv = { ...process.env }

const restore = (name: string) => {
  const value = original[name]

  if (value === undefined) {
    delete process.env[name]

    return
  }

  process.env[name] = value
}

describe('queue factory', () => {
  afterEach(() => {
    variables.forEach(restore)
  })

  test('WHEN the consumer variables are set SHOULD build the consumer config', () => {
    process.env.SQS_QUEUE_URL = 'http://queue'
    process.env.SQS_DEAD_LETTER_QUEUE_URL = 'http://dead'

    const environment = new Environment()
    const config = createQueueConfig(environment)

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
    const config = createPublishConfig(environment)

    expect(config).toEqual({ eventsQueueUrl: 'http://events' })
    expect(config.eventsQueueUrl).not.toBe(environment.queueUrl)
  })
})
