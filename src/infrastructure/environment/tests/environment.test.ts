import { afterEach, describe, expect, test } from 'bun:test'
import { Environment } from '../environment'

const variables = [
  'PORT',
  'LOG_PRETTY',
  'DATABASE_URL',
  'AWS_REGION',
  'AWS_ENDPOINT_URL',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'SQS_QUEUE_URL',
  'SQS_DEAD_LETTER_QUEUE_URL',
]

const original: NodeJS.ProcessEnv = { ...process.env }

const clear = () => {
  variables.forEach((name) => {
    delete process.env[name]
  })
}

const restore = (name: string) => {
  const value = original[name]

  if (value === undefined) {
    delete process.env[name]

    return
  }

  process.env[name] = value
}

describe('Environment', () => {
  afterEach(() => {
    variables.forEach(restore)
  })

  test('WHEN no variable is set SHOULD answer the fallback', () => {
    clear()

    const environment = new Environment()

    expect(environment.port).toBe(3000)
    expect(environment.pretty).toBe(false)
    expect(environment.region).toBe('us-east-1')
    expect(environment.accessKeyId).toBe('test')
    expect(environment.secretAccessKey).toBe('test')
    expect(environment.queueUrl).toBe(String())
    expect(environment.databaseUrl).toBeUndefined()
  })

  test('WHEN a variable is set SHOULD answer it', () => {
    process.env.PORT = '4000'
    process.env.LOG_PRETTY = 'true'
    process.env.SQS_QUEUE_URL = 'http://queue'
    process.env.DATABASE_URL = 'postgresql://database'

    const environment = new Environment()

    expect(environment.port).toBe(4000)
    expect(environment.pretty).toBe(true)
    expect(environment.queueUrl).toBe('http://queue')
    expect(environment.databaseUrl).toBe('postgresql://database')
  })
})
