import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { MikroORM } from '@mikro-orm/postgresql'
import { uuidv7 } from 'uuidv7'
import { IdempotencyService } from '@application/idempotencies/services'
import { WagerMediator } from '@application/wagers/mediators'
import { SimpleMetric } from '@infrastructure/observability'
import { LedgerDirection } from '@domain/ledger/enums'
import { Money } from '@domain/money/money'
import { Wallet } from '@domain/wallet/wallet'
import {
  FailureCode,
  WagerTransactionKind,
  WagerTransactionStatus,
} from '@domain/wager/enums'
import { WagerTransaction } from '@domain/wager/wager'
import { WagerEventsMapper } from '../../messaging/mappers'
import { WalletLedgerRepository } from '../repositories/wallet-ledger.repository'
import { WagerSubmitWriter } from '../writers/wager-submit.writer'
import { WagerTransactionRepository } from '../repositories/wager-transaction.repository'
import { WalletRepository } from '../repositories/wallet.repository'
import { PersistenceHarness } from './persistence.harness'
import { clock, journey } from './journey.stubs'

const currency = {
  brl: 'BRL',
}

const amount = {
  hundred: '100.00',
  ten: '10.00',
  ninety: '90.00',
  hundredTen: '110.00',
}

const instant = {
  open: new Date('2026-01-01T00:00:00.000Z'),
  processed: new Date('2026-01-01T00:00:01.000Z'),
  later: new Date('2026-01-01T00:00:02.000Z'),
}

const provider = {
  jungle: 'jungle-provider',
}

const game = 'fortune-tiger'

class Suite {
  static orm: MikroORM

  static wallets: WalletRepository

  static ledger: WalletLedgerRepository

  static wagers: WagerTransactionRepository

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

const wager = (
  wallet: Wallet,
  roundId: string,
  kind: WagerTransactionKind,
  moneyAmount: string,
  externalTransactionId: string,
  referenceExternalTransactionId: string | undefined,
  payloadHash: string,
) => {
  const id = uuidv7()
  const money = Money.from({ amount: moneyAmount, currency: currency.brl })
  const idempotencyKey = `${provider.jungle}:${externalTransactionId}`
  const input = {
    id,
    providerId: provider.jungle,
    externalTransactionId,
    idempotencyKey,
    payloadHash,
    walletId: wallet.id,
    playerId: wallet.playerId,
    roundId,
    gameId: game,
    kind,
    money,
    referenceExternalTransactionId,
    createdAt: instant.open,
  }

  return WagerTransaction.create(input)
}

beforeAll(async () => {
  Suite.orm = await PersistenceHarness.open()
  Suite.wallets = new WalletRepository(Suite.orm.em)
  Suite.ledger = new WalletLedgerRepository(Suite.orm.em)
  Suite.wagers = new WagerTransactionRepository(Suite.orm.em)
  Suite.writer = new WagerSubmitWriter(
    Suite.orm,
    new IdempotencyService(),
    new WagerEventsMapper(),
    new WagerMediator(),
    new SimpleMetric(),
    clock,
    journey,
  )
})

beforeEach(async () => {
  await PersistenceHarness.reset(Suite.orm)
})

afterAll(async () => {
  await PersistenceHarness.close(Suite.orm)
})

describe('Wager reversal flow', () => {
  test('WHEN a bet is rolled back THEN a win on that bet SHOULD refuse already reversed', async () => {
    const wallet = openWallet(uuidv7())
    const roundId = uuidv7()
    const betExternal = uuidv7()

    await Suite.wallets.save(wallet)

    const bet = wager(
      wallet,
      roundId,
      WagerTransactionKind.BET,
      amount.ten,
      betExternal,
      undefined,
      'bet-hash',
    )
    const rollback = wager(
      wallet,
      roundId,
      WagerTransactionKind.ROLLBACK,
      amount.ten,
      uuidv7(),
      betExternal,
      'rollback-hash',
    )
    const win = wager(
      wallet,
      roundId,
      WagerTransactionKind.WIN,
      amount.ten,
      uuidv7(),
      betExternal,
      'win-hash',
    )

    await Suite.writer.submit(bet, instant.processed)
    await Suite.writer.submit(rollback, instant.later)

    const outcome = await Suite.writer.submit(win, instant.later)

    expect(outcome.status).toBe(WagerTransactionStatus.REJECTED)
    expect(outcome.failureCode).toBe(FailureCode.REFERENCE_ALREADY_REVERSED)
  })

  test('WHEN a bet wins THEN a rollback on the win SHOULD debit the win', async () => {
    const wallet = openWallet(uuidv7())
    const roundId = uuidv7()
    const betExternal = uuidv7()
    const winExternal = uuidv7()

    await Suite.wallets.save(wallet)

    const bet = wager(
      wallet,
      roundId,
      WagerTransactionKind.BET,
      amount.ten,
      betExternal,
      undefined,
      'bet-hash',
    )
    const win = wager(
      wallet,
      roundId,
      WagerTransactionKind.WIN,
      amount.ten,
      winExternal,
      betExternal,
      'win-hash',
    )
    const rollback = wager(
      wallet,
      roundId,
      WagerTransactionKind.ROLLBACK,
      amount.ten,
      uuidv7(),
      winExternal,
      'rollback-hash',
    )

    await Suite.writer.submit(bet, instant.processed)
    await Suite.writer.submit(win, instant.later)
    await Suite.writer.submit(rollback, instant.later)

    Suite.orm.em.clear()

    const stored = await Suite.wallets.findById(wallet.id)
    const rows = await Suite.ledger.listByWalletId(wallet.id)

    expect(stored?.balance.amount).toBe(amount.ninety)
    expect(rows).toHaveLength(3)
    expect(rows[2]?.direction).toBe(LedgerDirection.DEBIT)
  })

  test('WHEN a bet is refunded twice SHOULD process one refund and reject the second', async () => {
    const wallet = openWallet(uuidv7())
    const roundId = uuidv7()
    const betExternal = uuidv7()

    await Suite.wallets.save(wallet)

    const bet = wager(
      wallet,
      roundId,
      WagerTransactionKind.BET,
      amount.ten,
      betExternal,
      undefined,
      'bet-hash',
    )
    const firstRefund = wager(
      wallet,
      roundId,
      WagerTransactionKind.REFUND,
      amount.ten,
      uuidv7(),
      betExternal,
      'refund-one',
    )
    const secondRefund = wager(
      wallet,
      roundId,
      WagerTransactionKind.REFUND,
      amount.ten,
      uuidv7(),
      betExternal,
      'refund-two',
    )

    await Suite.writer.submit(bet, instant.processed)
    await Suite.writer.submit(firstRefund, instant.later)

    const secondOutcome = await Suite.writer.submit(secondRefund, instant.later)

    expect(secondOutcome.status).toBe(WagerTransactionStatus.REJECTED)
    expect(secondOutcome.failureCode).toBe(FailureCode.REFERENCE_ALREADY_REVERSED)
  })

  test('WHEN two rollbacks race on the same bet SHOULD process one and reject one', async () => {
    const wallet = openWallet(uuidv7())
    const roundId = uuidv7()
    const betExternal = uuidv7()

    await Suite.wallets.save(wallet)

    const bet = wager(
      wallet,
      roundId,
      WagerTransactionKind.BET,
      amount.ten,
      betExternal,
      undefined,
      'bet-hash',
    )
    const firstRollback = wager(
      wallet,
      roundId,
      WagerTransactionKind.ROLLBACK,
      amount.ten,
      uuidv7(),
      betExternal,
      'rollback-one',
    )
    const secondRollback = wager(
      wallet,
      roundId,
      WagerTransactionKind.ROLLBACK,
      amount.ten,
      uuidv7(),
      betExternal,
      'rollback-two',
    )

    await Suite.writer.submit(bet, instant.processed)

    const first = async () => {
      await Suite.writer.submit(firstRollback, instant.later)
    }
    const second = async () => {
      await Suite.writer.submit(secondRollback, instant.later)
    }

    await Promise.all([first(), second()])

    Suite.orm.em.clear()

    const stored = await Suite.wallets.findById(wallet.id)
    const rows = await Suite.ledger.listByWalletId(wallet.id)
    const firstStored = await Suite.wagers.findById(firstRollback.id)
    const secondStored = await Suite.wagers.findById(secondRollback.id)
    const statuses = [firstStored?.status, secondStored?.status]
    const processed = statuses.filter((status) => status === WagerTransactionStatus.PROCESSED)
    const rejected = statuses.filter((status) => status === WagerTransactionStatus.REJECTED)

    expect(stored?.balance.amount).toBe(amount.hundred)
    expect(rows).toHaveLength(2)
    expect(processed).toHaveLength(1)
    expect(rejected).toHaveLength(1)
  })
})
