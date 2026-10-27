import { Inject, Injectable } from '@nestjs/common'
import { CACHE } from '@application/cache'
import type { CacheProtocol } from '@application/cache'
import type { LoggerProtocol, MetricProtocol } from '@application/observability'
import { LOGGER, METRIC, metricNames } from '@application/observability'
import type { WagerReaderProtocol } from '@application/wagers'
import { Money } from '@domain/money/money'
import { FailureCode, WagerTransactionKind, WagerTransactionStatus } from '@domain/wager/enums'
import { WagerTransaction } from '@domain/wager/wager'
import { WagerReader } from '../../persistence/readers/wager.reader'

const idPrefix = 'wager:'
const providerPrefix = 'wager:provider:'
const ttlSeconds = 60

@Injectable()
export class CachedWagerReader implements WagerReaderProtocol {
  constructor(
    private readonly delegate: WagerReader,
    @Inject(CACHE) private readonly cache: CacheProtocol,
    @Inject(LOGGER) private readonly logger: LoggerProtocol,
    @Inject(METRIC) private readonly metric: MetricProtocol,
  ) {}

  async findById(id: string): Promise<WagerTransaction | undefined> {
    const key = `${idPrefix}${id}`

    return this.readWithFallback(key, () => this.delegate.findById(id))
  }

  async findByProviderAndExternal(
    providerId: string,
    externalTransactionId: string,
  ): Promise<WagerTransaction | undefined> {
    const key = `${providerPrefix}${providerId}:${externalTransactionId}`
    const read = () => this.delegate.findByProviderAndExternal(providerId, externalTransactionId)

    return this.readWithFallback(key, read)
  }

  private async readWithFallback(
    key: string,
    fallback: () => Promise<WagerTransaction | undefined>,
  ): Promise<WagerTransaction | undefined> {
    const cached = await this.read(key)

    if (cached !== undefined) {
      const wager = this.parse(cached)

      if (wager !== undefined) {
        this.metric.increment(metricNames.cacheHit)
        return wager
      }
    }

    this.metric.increment(metricNames.cacheMiss)

    const wager = await fallback()

    if (wager !== undefined) {
      await this.write(key, this.serialize(wager))
    }

    return wager
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

  private serialize(wager: WagerTransaction): string {
    return JSON.stringify({
      id: wager.id,
      providerId: wager.providerId,
      externalTransactionId: wager.externalTransactionId,
      idempotencyKey: wager.idempotencyKey,
      payloadHash: wager.payloadHash,
      walletId: wager.walletId,
      playerId: wager.playerId,
      roundId: wager.roundId,
      gameId: wager.gameId,
      kind: wager.kind,
      money: wager.money.toJSON(),
      referenceExternalTransactionId: wager.referenceExternalTransactionId,
      createdAt: wager.createdAt.toISOString(),
      status: wager.status,
      referenceTransactionId: wager.referenceTransactionId,
      failureCode: wager.failureCode,
      processedAt: wager.processedAt?.toISOString(),
      attempts: wager.attempts,
      nextAttemptAt: wager.nextAttemptAt?.toISOString(),
    })
  }

  private parse(value: string): WagerTransaction | undefined {
    try {
      const schema = JSON.parse(value)

      return WagerTransaction.rehydrate({
        id: schema.id,
        providerId: schema.providerId,
        externalTransactionId: schema.externalTransactionId,
        idempotencyKey: schema.idempotencyKey,
        payloadHash: schema.payloadHash,
        walletId: schema.walletId,
        playerId: schema.playerId,
        roundId: schema.roundId,
        gameId: schema.gameId,
        kind: schema.kind as WagerTransactionKind,
        money: Money.from(schema.money),
        referenceExternalTransactionId: schema.referenceExternalTransactionId,
        createdAt: new Date(schema.createdAt),
        status: schema.status as WagerTransactionStatus,
        referenceTransactionId: schema.referenceTransactionId,
        failureCode: schema.failureCode as FailureCode | undefined,
        processedAt: schema.processedAt === undefined ? undefined : new Date(schema.processedAt),
        attempts: schema.attempts,
        nextAttemptAt: schema.nextAttemptAt === undefined ? undefined : new Date(schema.nextAttemptAt),
      })
    } catch (error) {
      this.logger.warn((error as Error).message)
      return undefined
    }
  }
}
