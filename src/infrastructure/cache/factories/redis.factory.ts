import { Injectable } from '@nestjs/common'
import Redis from 'ioredis'
import { Environment } from '../../environment'
import type { FactoryProtocol } from '../../protocols'

const lazyConnect = true

@Injectable()
export class RedisFactory implements FactoryProtocol<Redis> {
  constructor(private readonly environment: Environment) {}

  create(): Redis {
    return new Redis(this.environment.redisUrl, { lazyConnect })
  }
}
