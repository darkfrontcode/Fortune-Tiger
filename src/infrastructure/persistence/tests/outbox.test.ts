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
import { OutboxMessageEntity } from '../entities/outbox-message.entity'
import { WagerSubmitWriter } from '../writers/wager-submit.writer'
import { WalletRepository } from '../repositories/wallet.repository'
import { PersistenceHarness } from './persistence.harness'
import { clock, journey } from './journey.stubs'

const currency = {
  brl: 'BRL',
}

const amount = {
  hundred: '100.00',
  twenty: '20.00',
  eighty: '80.00',
  twoHundred: '200.00',
}

const instant = {
  open: new Date('2026-01-01T00:00:00.000Z'),
  processed: new Date('2026-01-01T00:00:01.000Z'),
}

const provider = {
  jungle: 'jungle-provider',
}

const scope = {
  game: 'fortune-tiger',
}

const revision = {
  changed: 2,
}

const events = {
  processed: 'WagerTransactionProcessed',
  rejected: 'WagerTransactionRejected',
  changed: 'WalletBalanceChanged',
  pendingReference: 'WagerTransactionPendingReference',
}

class Suite {
  static orm: MikroORM

  static wallets: WalletRepository

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

const submitWager = (
  wallet: Wallet,
  kind: WagerTransactionKind,
  value: string,
  referenceExternalTransactionId: string | undefined,
) => {
  const id = uuidv7()
  const externalTransactionId = uuidv7()
  const idempotencyKey = `${provider.jungle}:${externalTransactionId}`
  const payloadHash = uuidv7()
  const money = Money.from({ amount: value, currency: currency.brl })
  const input = {
    id,
    providerId: provider.jungle,
    externalTransactionId,
    idempotencyKey,
    payloadHash,
    walletId: wallet.id,
    playerId: wallet.playerId,
    roundId: uuidv7(),
    gameId: scope.game,
    kind,
    money,
    referenceExternalTransactionId,
    createdAt: instant.open,
  }

  return WagerTransaction.create(input)
}

const byEventType = (row: OutboxMessageEntity) => row.eventType

const byPending = (row: OutboxMessageEntity) => row.publishedAt == null

beforeAll(async () => {
  Suite.orm = await PersistenceHarness.open()
  Suite.wallets = new WalletRepository(Suite.orm.em)
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

describe('Outbox persistence', () => {
  test('WHEN a bet is processed SHOULD commit the processed and the balance event', async () => {
    const wallet = openWallet(uuidv7())
    const wager = submitWager(wallet, WagerTransactionKind.BET, amount.twenty, undefined)

    await Suite.wallets.save(wallet)

    await Suite.writer.submit(wager, instant.processed)

    Suite.orm.em.clear()

    const rows = await Suite.orm.em.find(OutboxMessageEntity, {})
    const types = rows.map(byEventType).sort()
    const expected = [events.processed, events.changed]
    const byChanged = (row: OutboxMessageEntity) => row.eventType === events.changed
    const changed = rows.find(byChanged)
    const pending = rows.every(byPending)
    const data = {
      walletId: wallet.id,
      transactionId: wager.id,
      direction: LedgerDirection.DEBIT,
      money: { amount: amount.twenty, currency: currency.brl },
      balanceBefore: { amount: amount.hundred, currency: currency.brl },
      balanceAfter: { amount: amount.eighty, currency: currency.brl },
      walletVersion: revision.changed,
    }

    expect(types).toEqual(expected)
    expect(pending).toBe(true)
    expect(changed?.payload.data).toEqual(data)
  })

  test('WHEN a loss is processed SHOULD commit only the processed event', async () => {
    const wallet = openWallet(uuidv7())
    const wager = submitWager(wallet, WagerTransactionKind.LOSS, amount.twenty, undefined)

    await Suite.wallets.save(wallet)

    await Suite.writer.submit(wager, instant.processed)

    Suite.orm.em.clear()

    const rows = await Suite.orm.em.find(OutboxMessageEntity, {})
    const types = rows.map(byEventType)
    const expected = [events.processed]
    const balance = await Suite.wallets.findById(wallet.id)

    expect(types).toEqual(expected)
    expect(balance?.balance.amount).toBe(amount.hundred)
  })

  test('WHEN a bet is rejected SHOULD commit the rejected event with the failure code', async () => {
    const wallet = openWallet(uuidv7())
    const wager = submitWager(wallet, WagerTransactionKind.BET, amount.twoHundred, undefined)

    await Suite.wallets.save(wallet)

    await Suite.writer.submit(wager, instant.processed)

    Suite.orm.em.clear()

    const rows = await Suite.orm.em.find(OutboxMessageEntity, {})
    const types = rows.map(byEventType)
    const expected = [events.rejected]
    const row = rows[0]
    const data = {
      transactionId: wager.id,
      providerId: provider.jungle,
      externalTransactionId: wager.externalTransactionId,
      playerId: wallet.playerId,
      walletId: wallet.id,
      kind: WagerTransactionKind.BET,
      status: WagerTransactionStatus.REJECTED,
      failureCode: FailureCode.INSUFFICIENT_FUNDS,
    }

    expect(types).toEqual(expected)
    expect(row?.payload.data).toEqual(data)
    expect(wager.status).toBe(WagerTransactionStatus.REJECTED)
  })

  test('WHEN the reference is missing SHOULD commit the pending reference event', async () => {
    const wallet = openWallet(uuidv7())
    const reference = uuidv7()
    const wager = submitWager(wallet, WagerTransactionKind.REFUND, amount.twenty, reference)

    await Suite.wallets.save(wallet)

    await Suite.writer.submit(wager, instant.processed)

    Suite.orm.em.clear()

    const rows = await Suite.orm.em.find(OutboxMessageEntity, {})
    const types = rows.map(byEventType)
    const expected = [events.pendingReference]

    expect(types).toEqual(expected)
    expect(wager.status).toBe(WagerTransactionStatus.PENDING_REFERENCE)
  })
})
