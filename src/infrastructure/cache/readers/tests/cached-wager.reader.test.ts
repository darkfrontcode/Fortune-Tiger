import { describe, expect, it } from 'bun:test'
import type { CacheProtocol } from '@application/cache'
import type { LoggerProtocol, MetricProtocol } from '@application/observability'
import { metricNames } from '@application/observability'
import { Money } from '@domain/money/money'
import { WagerTransactionKind, WagerTransactionStatus } from '@domain/wager/enums'
import { WagerTransaction } from '@domain/wager/wager'
import type { WagerReaderProtocol } from '@application/wagers'
import { CachedWagerReader } from '../cached-wager.reader'
import { WagerReader } from '../../../persistence/readers/wager.reader'

const wagerId = '0190f0f0-0000-7000-8000-000000000002'
const providerId = 'provider-a'
const externalTransactionId = 'transaction-1'
const createdAt = new Date('2026-07-29T15:00:00.000Z')

const wager = (): WagerTransaction => {
  const money = Money.from({ amount: '10.00', currency: 'BRL' })
  const schema = {
    id: wagerId,
    providerId,
    externalTransactionId,
    idempotencyKey: `${providerId}:${externalTransactionId}`,
    payloadHash: 'hash',
    walletId: '0190f0f0-0000-7000-8000-000000000001',
    playerId: 'player-a',
    roundId: 'round-1',
    gameId: 'game-1',
    kind: WagerTransactionKind.BET,
    money,
    referenceExternalTransactionId: undefined,
    createdAt,
    status: WagerTransactionStatus.PROCESSED,
    referenceTransactionId: undefined,
    failureCode: undefined,
    processedAt: createdAt,
    attempts: 0,
    nextAttemptAt: undefined,
  }

  return WagerTransaction.rehydrate(schema)
}

const stored = (value: WagerTransaction): string => JSON.stringify({
  id: value.id,
  providerId: value.providerId,
  externalTransactionId: value.externalTransactionId,
  idempotencyKey: value.idempotencyKey,
  payloadHash: value.payloadHash,
  walletId: value.walletId,
  playerId: value.playerId,
  roundId: value.roundId,
  gameId: value.gameId,
  kind: value.kind,
  money: value.money.toJSON(),
  referenceExternalTransactionId: value.referenceExternalTransactionId,
  createdAt: createdAt.toISOString(),
  status: value.status,
  referenceTransactionId: value.referenceTransactionId,
  failureCode: value.failureCode,
  processedAt: createdAt.toISOString(),
  attempts: value.attempts,
  nextAttemptAt: value.nextAttemptAt,
})

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

class Delegate implements WagerReaderProtocol {
  constructor(
    private readonly found: WagerTransaction | undefined = undefined,
    private readonly byProvider: WagerTransaction | undefined = undefined,
  ) {}

  async findById(id: string): Promise<WagerTransaction | undefined> {
    void id
    return this.found
  }

  async findByProviderAndExternal(
    provider: string,
    external: string,
  ): Promise<WagerTransaction | undefined> {
    void provider
    void external
    return this.byProvider
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
  delegate?: WagerReaderProtocol
  logger?: RecordingLogger
  metric?: RecordingMetric
}) =>
  new CachedWagerReader(
    options.delegate as WagerReader,
    options.cache ?? new RecordingCache(),
    options.logger ?? new RecordingLogger(),
    options.metric ?? new RecordingMetric(),
  )

describe('CachedWagerReader', () => {
  it('WHEN the cache holds the wager SHOULD answer the hit by id', async () => {
    const cache = new RecordingCache()
    await cache.set(`wager:${wagerId}`, stored(wager()), 60)

    const delegate = new Delegate(undefined, undefined)
    const metric = new RecordingMetric()

    const found = await subject({ cache, delegate, metric }).findById(wagerId)

    expect(found?.id).toBe(wagerId)
    expect(found?.status).toBe(WagerTransactionStatus.PROCESSED)
    expect(found?.money.amount).toBe('10.00')
    expect(metric.increments).toEqual([metricNames.cacheHit])
  })

  it('WHEN the cache holds the wager SHOULD answer the hit by provider pair', async () => {
    const cache = new RecordingCache()
    await cache.set(`wager:provider:${providerId}:${externalTransactionId}`, stored(wager()), 60)

    const metric = new RecordingMetric()
    const found = await subject({ cache, delegate: new Delegate(), metric })
      .findByProviderAndExternal(providerId, externalTransactionId)

    expect(found?.id).toBe(wagerId)
    expect(metric.increments).toEqual([metricNames.cacheHit])
  })

  it('WHEN the cache misses SHOULD read from the delegate and store the wager', async () => {
    const cache = new RecordingCache()
    const delegate = new Delegate(wager(), undefined)
    const metric = new RecordingMetric()

    const found = await subject({ cache, delegate, metric }).findById(wagerId)

    expect(found?.id).toBe(wagerId)
    expect(cache.keys.has(`wager:${wagerId}`)).toBe(true)
    expect(metric.increments).toEqual([metricNames.cacheMiss])
  })

  it('WHEN Redis is unavailable SHOULD fall through to the delegate and warn', async () => {
    const cache = new RecordingCache(true)
    const delegate = new Delegate(wager(), undefined)
    const logger = new RecordingLogger()
    const metric = new RecordingMetric()

    const found = await subject({ cache, delegate, logger, metric }).findById(wagerId)

    expect(found?.id).toBe(wagerId)
    expect(logger.warnings).toHaveLength(2)
    expect(metric.increments).toEqual([metricNames.cacheMiss])
  })

  it('WHEN the wager is absent SHOULD answer nothing and store nothing', async () => {
    const cache = new RecordingCache()
    const delegate = new Delegate(undefined, undefined)
    const metric = new RecordingMetric()

    const found = await subject({ cache, delegate, metric }).findById(wagerId)

    expect(found).toBeUndefined()
    expect(cache.keys.size).toBe(0)
    expect(metric.increments).toEqual([metricNames.cacheMiss])
  })
})
