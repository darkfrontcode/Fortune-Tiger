import { describe, expect, it } from 'bun:test'
import type { LoggerProtocol } from '@application/observability'
import Redis from 'ioredis'
import { RedisCache } from '../redis.cache'

const key = 'wallet:0190f0f0-0000-7000-8000-000000000001'

class RecordingLogger implements LoggerProtocol {
  readonly warnings = [] as string[]

  warn(value: string): void {
    this.warnings.push(value)
  }
}

class RedisStub {
  readonly stored = new Map<string, string>()

  constructor(private readonly failure = false) {}

  async get(input: string): Promise<string | null> {
    if (this.failure) { throw new Error('Redis unavailable') }

    return this.stored.get(input) ?? null
  }

  async set(t: string, value: string): Promise<string> {
    if (this.failure) { throw new Error('Redis unavailable') }

    this.stored.set(t, value)

    return 'OK'
  }
}

describe('RedisCache', () => {
  it('WHEN the key exists SHOULD return the stored value', async () => {
    const client = new RedisStub()
    const cache = new RedisCache(client as unknown as Redis, new RecordingLogger())

    await cache.set(key, 'value', 30)

    await expect(cache.get(key)).resolves.toBe('value')
  })

  it('WHEN the key is absent SHOULD answer nothing', async () => {
    const cache = new RedisCache(new RedisStub() as unknown as Redis, new RecordingLogger())

    await expect(cache.get(key)).resolves.toBeUndefined()
  })

  it('WHEN Redis fails on a read SHOULD answer nothing', async () => {
    const logger = new RecordingLogger()
    const cache = new RedisCache(new RedisStub(true) as unknown as Redis, logger)

    await expect(cache.get(key)).resolves.toBeUndefined()
    expect(logger.warnings).toHaveLength(1)
  })

  it('WHEN Redis fails on a write SHOULD drop the value silently with a warning', async () => {
    const logger = new RecordingLogger()
    const cache = new RedisCache(new RedisStub(true) as unknown as Redis, logger)

    await expect(cache.set(key, 'value', 30)).resolves.toBeUndefined()
    expect(logger.warnings).toHaveLength(1)
  })
})
