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
    expect(environment.queueUrl).toBe(String())
    expect(environment.eventsQueueUrl).toBe(String())
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
    process.env.SQS_EVENTS_QUEUE_URL = 'http://events'
    process.env.DATABASE_URL = 'postgresql://database'

    const environment = new Environment()

    expect(environment.port).toBe(4000)
    expect(environment.pretty).toBe(true)
    expect(environment.queueUrl).toBe('http://queue')
    expect(environment.eventsQueueUrl).toBe('http://events')
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
