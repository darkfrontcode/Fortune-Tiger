import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { MikroORM } from '@mikro-orm/postgresql'
import { uuidv7 } from 'uuidv7'
import { LedgerDirection } from '@domain/ledger/enums'
import { Ledger } from '@domain/ledger/ledger'
import { Money } from '@domain/money/money'
import { Wallet } from '@domain/wallet/wallet'
import { WagerTransactionKind } from '@domain/wager/enums'
import { WagerTransaction } from '@domain/wager/wager'
import { WalletLedgerRepository } from '../ledger/wallet-ledger.repository'
import { WagerTransactionRepository } from '../wager/wager-transaction.repository'
import { WalletRepository } from '../wallet/wallet.repository'
import { PersistenceHarness } from './persistence.harness'

const currency = {
  brl: 'BRL',
}

const amount = {
  hundred: '100.00',
  twenty: '20.00',
  eighty: '80.00',
}

const instant = {
  open: new Date('2026-01-01T00:00:00.000Z'),
  move: new Date('2026-01-01T00:00:01.000Z'),
  later: new Date('2026-01-01T00:00:02.000Z'),
}

const revision = {
  open: 1,
  moved: 2,
}

const provider = 'jungle-provider'

class Suite {
  static orm: MikroORM

  static wallets: WalletRepository

  static ledger: WalletLedgerRepository

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

const pendingBet = (wallet: Wallet) => {
  const externalTransactionId = uuidv7()
  const input = {
    id: uuidv7(),
    providerId: provider,
    externalTransactionId,
    idempotencyKey: `${provider}:${externalTransactionId}`,
    payloadHash: 'payload-hash',
    walletId: wallet.id,
    playerId: wallet.playerId,
    roundId: uuidv7(),
    gameId: 'fortune-tiger',
    kind: WagerTransactionKind.BET,
    money: Money.zero(currency.brl),
    referenceExternalTransactionId: undefined,
    createdAt: instant.open,
  }

  return WagerTransaction.create(input)
}

beforeAll(async () => {
  Suite.orm = await PersistenceHarness.open()
  Suite.wallets = new WalletRepository(Suite.orm.em)
  Suite.ledger = new WalletLedgerRepository(Suite.orm.em)
  Suite.wagers = new WagerTransactionRepository(Suite.orm.em)
})

beforeEach(async () => {
  await PersistenceHarness.reset(Suite.orm)
})

afterAll(async () => {
  await PersistenceHarness.close(Suite.orm)
})

describe('WalletRepository', () => {
  test('WHEN a wallet is saved SHOULD reload the same balance and version', async () => {
    const playerId = uuidv7()
    const wallet = openWallet(playerId)

    await Suite.wallets.save(wallet)

    const stored = await Suite.wallets.findById(wallet.id)

    expect(stored).toBeDefined()
    expect(stored?.balance.amount).toBe(amount.hundred)
    expect(stored?.version).toBe(revision.open)
    expect(stored?.playerId).toBe(playerId)
  })

  test('WHEN the balance changes SHOULD persist the new version', async () => {
    const wallet = openWallet(uuidv7())
    const debit = Money.from({ amount: amount.twenty, currency: currency.brl })

    await Suite.wallets.save(wallet)

    wallet.debit(debit, instant.move)
    await Suite.wallets.save(wallet)

    const stored = await Suite.wallets.findById(wallet.id)

    expect(stored?.balance.amount).toBe('80.00')
    expect(stored?.version).toBe(revision.moved)
  })

  test('WHEN player and currency repeat SHOULD keep a single wallet row', async () => {
    const playerId = uuidv7()
    const first = openWallet(playerId)

    await Suite.wallets.save(first)

    const found = await Suite.wallets.findByPlayerAndCurrency(playerId, currency.brl)

    expect(found?.id).toBe(first.id)
  })
})

describe('WalletLedgerRepository', () => {
  test('WHEN a ledger entry is saved SHOULD reload by transaction id', async () => {
    const wallet = openWallet(uuidv7())
    const debit = Money.from({ amount: amount.eighty, currency: currency.brl })
    const wager = pendingBet(wallet)

    await Suite.wallets.save(wallet)
    await Suite.wagers.save(wager)

    wallet.debit(debit, instant.move)
    await Suite.wallets.save(wallet)

    const before = Money.from({ amount: amount.hundred, currency: currency.brl })
    const after = Money.from({ amount: '20.00', currency: currency.brl })
    const money = Money.from({ amount: amount.eighty, currency: currency.brl })
    const input = {
      id: uuidv7(),
      walletId: wallet.id,
      transactionId: wager.id,
      direction: LedgerDirection.DEBIT,
      money,
      balanceBefore: before,
      balanceAfter: after,
      createdAt: instant.move,
    }
    const row = Ledger.create(input)

    await Suite.ledger.save(row)

    const stored = await Suite.ledger.findByTransactionId(wager.id)

    expect(stored?.direction).toBe(LedgerDirection.DEBIT)
    expect(stored?.money.amount).toBe(amount.eighty)
    expect(stored?.balanceAfter.amount).toBe('20.00')
  })

  test('WHEN entries exist SHOULD list them in creation order', async () => {
    const wallet = openWallet(uuidv7())
    const firstMoney = Money.from({ amount: amount.twenty, currency: currency.brl })
    const secondMoney = Money.from({ amount: amount.twenty, currency: currency.brl })
    const firstWager = pendingBet(wallet)
    const secondWager = pendingBet(wallet)

    await Suite.wallets.save(wallet)
    await Suite.wagers.save(firstWager)
    await Suite.wagers.save(secondWager)

    wallet.debit(firstMoney, instant.move)
    await Suite.wallets.save(wallet)

    const firstBefore = Money.from({ amount: amount.hundred, currency: currency.brl })
    const firstAfter = Money.from({ amount: '80.00', currency: currency.brl })
    const first = Ledger.create({
      id: uuidv7(),
      walletId: wallet.id,
      transactionId: firstWager.id,
      direction: LedgerDirection.DEBIT,
      money: firstMoney,
      balanceBefore: firstBefore,
      balanceAfter: firstAfter,
      createdAt: instant.move,
    })

    await Suite.ledger.save(first)

    wallet.debit(secondMoney, instant.open)
    await Suite.wallets.save(wallet)

    const secondBefore = Money.from({ amount: '80.00', currency: currency.brl })
    const secondAfter = Money.from({ amount: '60.00', currency: currency.brl })
    const second = Ledger.create({
      id: uuidv7(),
      walletId: wallet.id,
      transactionId: secondWager.id,
      direction: LedgerDirection.DEBIT,
      money: secondMoney,
      balanceBefore: secondBefore,
      balanceAfter: secondAfter,
      createdAt: instant.later,
    })

    await Suite.ledger.save(second)

    const rows = await Suite.ledger.listByWalletId(wallet.id)

    expect(rows).toHaveLength(2)
    expect(rows[0]?.id).toBe(first.id)
    expect(rows[1]?.id).toBe(second.id)
  })
})
