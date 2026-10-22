import { UniqueConstraintViolationException } from '@mikro-orm/core'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { MikroORM } from '@mikro-orm/postgresql'
import { uuidv7 } from 'uuidv7'
import { Money } from '../../../domain/money/money'
import { Wallet } from '../../../domain/wallet/wallet'
import { WagerTransactionKind, WagerTransactionStatus } from '../../../domain/wager/enums'
import { WagerTransaction } from '../../../domain/wager/wager'
import { WagerTransactionRepository } from '../wager/wager-transaction.repository'
import { WalletRepository } from '../wallet/wallet.repository'
import { PersistenceHarness } from './persistence.harness'

const currency = {
  brl: 'BRL',
}

const amount = {
  hundred: '100.00',
  ten: '10.00',
}

const instant = {
  open: new Date('2026-01-01T00:00:00.000Z'),
  processed: new Date('2026-01-01T00:00:01.000Z'),
}

const provider = {
  jungle: 'jungle-provider',
}

type WagerOverrides = {
  id?: string
  externalTransactionId?: string
  idempotencyKey?: string
  payloadHash?: string
}

class Suite {
  static orm: MikroORM

  static wallets: WalletRepository

  static wagers: WagerTransactionRepository
}

const openWallet = (playerId: string) => {
  const id = uuidv7()
  const balance = Money.from({ amount: amount.hundred, currency: currency.brl })
  const input = {
    id,
    playerId,
    balance,
    openedAt: instant.open,
  }

  return Wallet.open(input)
}

const pendingBet = (wallet: Wallet, overrides: WagerOverrides = {}) => {
  const id = overrides.id ?? uuidv7()
  const externalTransactionId = overrides.externalTransactionId ?? uuidv7()
  const idempotencyKey = overrides.idempotencyKey ?? `${provider.jungle}:${externalTransactionId}`
  const payloadHash = overrides.payloadHash ?? 'payload-hash'
  const money = Money.from({ amount: amount.ten, currency: currency.brl })
  const input = {
    id,
    providerId: provider.jungle,
    externalTransactionId,
    idempotencyKey,
    payloadHash,
    walletId: wallet.id,
    playerId: wallet.playerId,
    roundId: uuidv7(),
    gameId: 'fortune-tiger',
    kind: WagerTransactionKind.BET,
    money,
    referenceExternalTransactionId: undefined,
    createdAt: instant.open,
  }

  return WagerTransaction.create(input)
}

beforeAll(async () => {
  Suite.orm = await PersistenceHarness.open()
  Suite.wallets = new WalletRepository(Suite.orm.em)
  Suite.wagers = new WagerTransactionRepository(Suite.orm.em)
})

beforeEach(async () => {
  await PersistenceHarness.reset(Suite.orm)
})

afterAll(async () => {
  await PersistenceHarness.close(Suite.orm)
})

describe('WagerTransactionRepository', () => {
  test('WHEN a wager is saved SHOULD reload by id and idempotency key', async () => {
    const wallet = openWallet(uuidv7())
    const wager = pendingBet(wallet)

    await Suite.wallets.save(wallet)
    await Suite.wagers.save(wager)

    const byId = await Suite.wagers.findById(wager.id)
    const byKey = await Suite.wagers.findByIdempotencyKey(wager.idempotencyKey)
    const byExternal = await Suite.wagers.findByProviderAndExternal(
      wager.providerId,
      wager.externalTransactionId,
    )

    expect(byId?.status).toBe(WagerTransactionStatus.PENDING)
    expect(byId?.money.amount).toBe(amount.ten)
    expect(byKey?.id).toBe(wager.id)
    expect(byExternal?.id).toBe(wager.id)
  })

  test('WHEN status changes SHOULD persist the terminal fields', async () => {
    const wallet = openWallet(uuidv7())
    const wager = pendingBet(wallet)
    const referenceId = uuidv7()

    await Suite.wallets.save(wallet)
    await Suite.wagers.save(wager)

    wager.markProcessed(referenceId, instant.processed)
    await Suite.wagers.save(wager)

    const stored = await Suite.wagers.findById(wager.id)

    expect(stored?.status).toBe(WagerTransactionStatus.PROCESSED)
    expect(stored?.referenceTransactionId).toBe(referenceId)
    expect(stored?.processedAt).toEqual(instant.processed)
  })

  test('WHEN idempotency key repeats SHOULD hit the unique constraint', async () => {
    const wallet = openWallet(uuidv7())
    const first = pendingBet(wallet)
    const second = pendingBet(wallet, {
      idempotencyKey: first.idempotencyKey,
      externalTransactionId: uuidv7(),
    })

    await Suite.wallets.save(wallet)
    await Suite.wagers.save(first)

    const attempt = async () => {
      await Suite.wagers.save(second)
    }

    await expect(attempt()).rejects.toBeInstanceOf(UniqueConstraintViolationException)
    Suite.orm.em.clear()
  })

  test('WHEN provider and external id repeat SHOULD hit the unique constraint', async () => {
    const wallet = openWallet(uuidv7())
    const first = pendingBet(wallet)
    const second = pendingBet(wallet, {
      externalTransactionId: first.externalTransactionId,
      idempotencyKey: uuidv7(),
    })

    await Suite.wallets.save(wallet)
    await Suite.wagers.save(first)

    const attempt = async () => {
      await Suite.wagers.save(second)
    }

    await expect(attempt()).rejects.toBeInstanceOf(UniqueConstraintViolationException)
    Suite.orm.em.clear()
  })
})
