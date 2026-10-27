import { Inject, Injectable } from '@nestjs/common'
import type { CacheProtocol } from '@application/cache'
import type { LoggerProtocol } from '@application/observability'
import { LOGGER } from '@application/observability'
import Redis from 'ioredis'

@Injectable()
export class RedisCache implements CacheProtocol {
  constructor(
    @Inject(Redis) private readonly client: Redis,
    @Inject(LOGGER) private readonly logger: LoggerProtocol,
  ) {}

  async get(key: string): Promise<string | undefined> {
    try {
      const value = await this.client.get(key)

      return value ?? undefined
    } catch (error) {
      this.logger.warn((error as Error).message)

      return undefined
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, value, 'EX', ttlSeconds)
    } catch (error) {
      this.logger.warn((error as Error).message)
    }
  }
}
