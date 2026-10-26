import { Inject, Injectable } from '@nestjs/common'
import { CACHE } from '@application/cache'
import type { CacheProtocol } from '@application/cache'
import type { LoggerProtocol, MetricProtocol } from '@application/observability'
import { LOGGER, METRIC, metricNames } from '@application/observability'
import type { WalletReaderProtocol } from '@application/wallets'
import { Money } from '@domain/money/money'
import { Wallet } from '@domain/wallet/wallet'
import { WalletReader } from '../../persistence/readers/wallet.reader'

const keyPrefix = 'wallet:'
const ttlSeconds = 30

@Injectable()
export class CachedWalletReader implements WalletReaderProtocol {
  constructor(
    private readonly delegate: WalletReader,
    @Inject(CACHE) private readonly cache: CacheProtocol,
    @Inject(LOGGER) private readonly logger: LoggerProtocol,
    @Inject(METRIC) private readonly metric: MetricProtocol,
  ) {}

  async findById(id: string): Promise<Wallet | undefined> {
    const key = `${keyPrefix}${id}`
    const cached = await this.read(key)

    if (cached !== undefined) {
      const wallet = this.parse(cached)

      if (wallet !== undefined) {
        this.metric.increment(metricNames.cacheHit)
        return wallet
      }
    }

    this.metric.increment(metricNames.cacheMiss)

    const wallet = await this.delegate.findById(id)

    if (wallet !== undefined) {
      await this.write(key, this.serialize(wallet))
    }

    return wallet
  }

  private async read(key: string): Promise<string | undefined> {
    try {
      return await this.cache.get(key)
    } catch (error) {
      this.logger.warn((error as Error).message)
      return undefined
    }
  }

  private async write(key: string, value: string): Promise<void> {
    try {
      await this.cache.set(key, value, ttlSeconds)
    } catch (error) {
      this.logger.warn((error as Error).message)
    }
  }

  private serialize(wallet: Wallet): string {
    return JSON.stringify({
      id: wallet.id,
      playerId: wallet.playerId,
      balance: wallet.balance.toJSON(),
      version: wallet.version,
      createdAt: wallet.createdAt.toISOString(),
      updatedAt: wallet.updatedAt.toISOString(),
    })
  }

  private parse(value: string): Wallet | undefined {
    try {
      const schema = JSON.parse(value)

      return Wallet.rehydrate({
        id: schema.id,
        playerId: schema.playerId,
        balance: Money.from(schema.balance),
        version: schema.version,
        createdAt: new Date(schema.createdAt),
        updatedAt: new Date(schema.updatedAt),
      })
    } catch (error) {
      this.logger.warn((error as Error).message)
      return undefined
    }
  }
}
