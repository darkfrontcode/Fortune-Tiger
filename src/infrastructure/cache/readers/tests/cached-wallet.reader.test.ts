import { describe, expect, it } from 'bun:test'
import type { CacheProtocol } from '@application/cache'
import type { LoggerProtocol, MetricProtocol } from '@application/observability'
import { metricNames } from '@application/observability'
import { Money } from '@domain/money/money'
import { Wallet } from '@domain/wallet/wallet'
import type { WalletReaderProtocol } from '@application/wallets'
import { CachedWalletReader } from '../cached-wallet.reader'
import { WalletReader } from '../../../persistence/readers/wallet.reader'

const walletId = '0190f0f0-0000-7000-8000-000000000001'
const playerId = 'player-a'
const openedAt = new Date('2026-07-29T15:00:00.000Z')

const wallet = (): Wallet => {
  const balance = Money.from({ amount: '100.00', currency: 'BRL' })
  const input = { id: walletId, playerId, balance, openedAt }

  return Wallet.open(input)
}

class RecordingCache implements CacheProtocol {
  readonly keys = new Map<string, string>()

  constructor(private readonly failure = false) {}

  async get(key: string): Promise<string | undefined> {
    if (this.failure) { throw new Error('Redis unavailable') }

    return this.keys.get(key)
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (this.failure) { throw new Error('Redis unavailable') }
    void ttlSeconds

    this.keys.set(key, value)
  }
}

class Delegate implements WalletReaderProtocol {
  constructor(private readonly found: Wallet | undefined = undefined) {}

  async findById(id: string): Promise<Wallet | undefined> {
    void id
    return this.found
  }
}

class RecordingLogger implements LoggerProtocol {
  readonly warnings = [] as string[]

  warn(value: string): void {
    this.warnings.push(value)
  }
}

class RecordingMetric implements MetricProtocol {
  readonly increments = [] as string[]

  increment(name: string): void {
    this.increments.push(name)
  }

  observe(): void {}

  async render(): Promise<string> {
    return ''
  }
}

const subject = (options: {
  cache?: CacheProtocol
  delegate?: WalletReaderProtocol
  logger?: RecordingLogger
  metric?: RecordingMetric
}) =>
  new CachedWalletReader(
    options.delegate as WalletReader,
    options.cache ?? new RecordingCache(),
    options.logger ?? new RecordingLogger(),
    options.metric ?? new RecordingMetric(),
  )

describe('CachedWalletReader', () => {
  it('WHEN the cache holds the wallet SHOULD answer the hit and not touch the delegate', async () => {
    const cached = wallet()
    const cache = new RecordingCache()
    await cache.set(`wallet:${walletId}`, JSON.stringify({
      id: walletId,
      playerId,
      balance: cached.balance.toJSON(),
      version: cached.version,
      createdAt: openedAt.toISOString(),
      updatedAt: openedAt.toISOString(),
    }), 30)

    const delegate = new Delegate(undefined)
    const metric = new RecordingMetric()

    const found = await subject({ cache, delegate, metric }).findById(walletId)

    expect(found?.id).toBe(walletId)
    expect(found?.balance.amount).toBe('100.00')
    expect(metric.increments).toEqual([metricNames.cacheHit])
  })

  it('WHEN the cache misses SHOULD read from the delegate and store the wallet', async () => {
    const cache = new RecordingCache()
    const delegate = new Delegate(wallet())
    const metric = new RecordingMetric()

    const found = await subject({ cache, delegate, metric }).findById(walletId)

    expect(found?.id).toBe(walletId)
    expect(cache.keys.has(`wallet:${walletId}`)).toBe(true)
    expect(metric.increments).toEqual([metricNames.cacheMiss])
  })

  it('WHEN Redis is unavailable SHOULD fall through to the delegate and warn', async () => {
    const cache = new RecordingCache(true)
    const delegate = new Delegate(wallet())
    const logger = new RecordingLogger()
    const metric = new RecordingMetric()

    const found = await subject({ cache, delegate, logger, metric }).findById(walletId)

    expect(found?.id).toBe(walletId)
    expect(logger.warnings).toHaveLength(2)
    expect(metric.increments).toEqual([metricNames.cacheMiss])
  })

  it('WHEN the wallet is absent SHOULD answer nothing and store nothing', async () => {
    const cache = new RecordingCache()
    const delegate = new Delegate(undefined)
    const metric = new RecordingMetric()

    const found = await subject({ cache, delegate, metric }).findById(walletId)

    expect(found).toBeUndefined()
    expect(cache.keys.size).toBe(0)
    expect(metric.increments).toEqual([metricNames.cacheMiss])
  })
})
