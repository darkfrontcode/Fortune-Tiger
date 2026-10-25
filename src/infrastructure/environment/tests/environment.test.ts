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
  'SQS_EVENTS_QUEUE_URL',
  'SQS_EVENTS_DEAD_LETTER_QUEUE_URL',
  'MONGODB_URL',
  'AUTH_MODE',
  'OIDC_ISSUER',
  'OIDC_AUDIENCE',
  'OIDC_JWKS_URL',
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
    expect(environment.endpoint).toBeUndefined()
    expect(environment.queueUrl).toBe(String())
    expect(environment.deadLetterQueueUrl).toBe(String())
    expect(environment.eventsQueueUrl).toBe(String())
    expect(environment.eventsDeadLetterQueueUrl).toBe(String())
    expect(environment.mongoUrl).toBe('mongodb://127.0.0.1:27017/fortune_tiger_audit')
    expect(environment.databaseUrl).toBeUndefined()
    expect(environment.authMode).toBe('anonymous')
    expect(environment.oidcIssuer).toBeUndefined()
    expect(environment.oidcAudience).toBeUndefined()
    expect(environment.oidcJwksUrl).toBeUndefined()
  })

  test('WHEN a variable is set SHOULD answer it', () => {
    process.env.PORT = '4000'
    process.env.LOG_PRETTY = 'true'
    process.env.SQS_QUEUE_URL = 'http://queue'
    process.env.SQS_DEAD_LETTER_QUEUE_URL = 'http://dead-letter'
    process.env.SQS_EVENTS_QUEUE_URL = 'http://events'
    process.env.SQS_EVENTS_DEAD_LETTER_QUEUE_URL = 'http://events-dead-letter'
    process.env.MONGODB_URL = 'mongodb://database:27017/audit'
    process.env.AWS_REGION = 'eu-west-1'
    process.env.AWS_ENDPOINT_URL = 'http://localstack'
    process.env.AWS_ACCESS_KEY_ID = 'access-key'
    process.env.AWS_SECRET_ACCESS_KEY = 'secret-key'
    process.env.METRICS_BACKEND = 'memory'
    process.env.DATABASE_URL = 'postgresql://database'

    const environment = new Environment()

    expect(environment.port).toBe(4000)
    expect(environment.pretty).toBe(true)
    expect(environment.region).toBe('eu-west-1')
    expect(environment.endpoint).toBe('http://localstack')
    expect(environment.accessKeyId).toBe('access-key')
    expect(environment.secretAccessKey).toBe('secret-key')
    expect(environment.metricsBackend).toBe('memory')
    expect(environment.queueUrl).toBe('http://queue')
    expect(environment.deadLetterQueueUrl).toBe('http://dead-letter')
    expect(environment.eventsQueueUrl).toBe('http://events')
    expect(environment.eventsDeadLetterQueueUrl).toBe('http://events-dead-letter')
    expect(environment.mongoUrl).toBe('mongodb://database:27017/audit')
    expect(environment.databaseUrl).toBe('postgresql://database')
  })

  test('WHEN the identity provider variables are set SHOULD answer them', () => {
    process.env.AUTH_MODE = 'jwt'
    process.env.OIDC_ISSUER = 'https://issuer.test/realms/fortune-tiger'
    process.env.OIDC_AUDIENCE = 'fortune-tiger-api'
    process.env.OIDC_JWKS_URL = 'https://issuer.test/realms/fortune-tiger/protocol/openid-connect/certs'

    const environment = new Environment()

    expect(environment.authMode).toBe('jwt')
    expect(environment.oidcIssuer).toBe('https://issuer.test/realms/fortune-tiger')
    expect(environment.oidcAudience).toBe('fortune-tiger-api')
    expect(environment.oidcJwksUrl).toBe(
      'https://issuer.test/realms/fortune-tiger/protocol/openid-connect/certs',
    )
  })
})
