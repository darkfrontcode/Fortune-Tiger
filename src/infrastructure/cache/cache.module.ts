import { Module } from '@nestjs/common'
import { CACHE } from '@application/cache'
import Redis from 'ioredis'
import { EnvironmentModule } from '../environment'
import { ObservabilityModule } from '../observability'
import { RedisFactory } from './factories'
import { RedisCache } from './redis.cache'

@Module({
  imports: [EnvironmentModule, ObservabilityModule],
  providers: [
    RedisFactory,
    { provide: Redis, useFactory: (factory: RedisFactory) => factory.create(), inject: [RedisFactory] },
    RedisCache,
    { provide: CACHE, useExisting: RedisCache },
  ],
  exports: [CACHE],
})
export class CacheModule {}
