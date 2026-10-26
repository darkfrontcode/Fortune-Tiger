import { describe, expect, test } from 'bun:test'
import { Environment } from '../../../environment'
import { RedisFactory } from '../redis.factory'

describe('RedisFactory', () => {
  test('WHEN the environment is set SHOULD build a Redis client', () => {
    const environment = new Environment()
    const client = new RedisFactory(environment).create()

    expect(client).toBeDefined()
  })
})
