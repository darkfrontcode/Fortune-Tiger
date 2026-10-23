import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { MikroORM } from '@mikro-orm/postgresql'
import { uuidv7 } from 'uuidv7'
import { IdempotencyService } from '@application/idempotencies/idempotency.service'
import { WagerMediator } from '@application/wagers/mediators'
import { SimpleMetric } from '@infrastructure/observability'
import { LedgerDirection } from '@domain/ledger/enums'
import { Money } from '@domain/money/money'
import { Wallet } from '@domain/wallet/wallet'
import { WagerTransactionKind, WagerTransactionStatus } from '@domain/wager/enums'
import { WagerTransaction } from '@domain/wager/wager'
import { WagerEventsMapper } from '../../messaging/mappers'
import { WalletLedgerRepository } from '../ledger/wallet-ledger.repository'
import { WagerSubmitWriter } from '../wager/wager-submit.writer'
import { WagerTransactionRepository } from '../wager/wager-transaction.repository'
import { WalletRepository } from '../wallet/wallet.repository'
import { PersistenceHarness } from './persistence.harness'

const currency = {
  brl: 'BRL',
}

const amount = {
  hundred: '100.00',
  eighty: '80.00',
  twenty: '20.00',
}

const instant = {
  open: new Date('2026-01-01T00:00:00.000Z'),
  processed: new Date('2026-01-01T00:00:01.000Z'),
}

const provider = {
  jungle: 'jungle-provider',
}

class Suite {
  static orm: MikroORM

  static wallets: WalletRepository

  static wagers: WagerTransactionRepository

  static ledger: WalletLedgerRepository

  static writer: WagerSubmitWriter
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

const pendingBet = (wallet: Wallet, externalTransactionId: string) => {
  const id = uuidv7()
  const idempotencyKey = `${provider.jungle}:${externalTransactionId}`
  const payloadHash = 'payload-hash'
  const money = Money.from({ amount: amount.eighty, currency: currency.brl })
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
  Suite.ledger = new WalletLedgerRepository(Suite.orm.em)
  Suite.writer = new WagerSubmitWriter(
    Suite.orm,
    new IdempotencyService(),
    new WagerEventsMapper(),
    new WagerMediator(),
    new SimpleMetric(),
  )
})

beforeEach(async () => {
  await PersistenceHarness.reset(Suite.orm)
})

afterAll(async () => {
  await PersistenceHarness.close(Suite.orm)
})

describe('Wallet lock', () => {
  test('WHEN two bets of 80 race on balance 100 SHOULD process one and reject one', async () => {
    const wallet = openWallet(uuidv7())
    const firstExternal = uuidv7()
    const secondExternal = uuidv7()
    const first = pendingBet(wallet, firstExternal)
    const second = pendingBet(wallet, secondExternal)

    await Suite.wallets.save(wallet)

    const firstBet = async () => {
      await Suite.writer.submit(first, instant.processed)
    }

    const secondBet = async () => {
      await Suite.writer.submit(second, instant.processed)
    }

    await Promise.all([firstBet(), secondBet()])

    Suite.orm.em.clear()

    const stored = await Suite.wallets.findById(wallet.id)
    const rows = await Suite.ledger.listByWalletId(wallet.id)
    const firstStored = await Suite.wagers.findById(first.id)
    const secondStored = await Suite.wagers.findById(second.id)
    const statuses = [firstStored?.status, secondStored?.status]
    const processed = statuses.filter((status) => status === WagerTransactionStatus.PROCESSED)
    const rejected = statuses.filter((status) => status === WagerTransactionStatus.REJECTED)

    expect(stored?.balance.amount).toBe(amount.twenty)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.direction).toBe(LedgerDirection.DEBIT)
    expect(rows[0]?.money.amount).toBe(amount.eighty)
    expect(processed).toHaveLength(1)
    expect(rejected).toHaveLength(1)
  })
})
