import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { MikroORM } from '@mikro-orm/postgresql'
import { uuidv7 } from 'uuidv7'
import { ReferenceMediator } from '../../../application/transactions/wager/mediators/reference.mediator'
import { WagerMediator } from '../../../application/transactions/wager/mediators/wager.mediator'
import { Money } from '../../../domain/money/money'
import { Wallet } from '../../../domain/wallet/wallet'
import {
  FailureCode,
  WagerTransactionKind,
  WagerTransactionStatus,
} from '../../../domain/wager/enums'
import { WagerType } from '../../../domain/wager/types'
import { WagerTransaction } from '../../../domain/wager/wager'
import { WagerEventsMapper } from '../../messaging/mappers'
import { OutboxMessageEntity } from '../outbox/outbox-message.entity'
import { WalletLedgerEntity } from '../ledger/wallet-ledger.entity'
import { ReferenceReader } from '../wager/reference.reader'
import { ReferenceRetryWriter } from '../wager/reference.retry.writer'
import { WagerTransactionRepository } from '../wager/wager-transaction.repository'
import { WalletRepository } from '../wallet/wallet.repository'
import { PersistenceHarness } from './persistence.harness'

type Schema = WagerType.Schema

const currency = {
  brl: 'BRL',
}

const amount = {
  ten: '10.00',
  hundred: '100.00',
  hundredTen: '110.00',
}

const instant = {
  open: new Date('2026-01-01T00:00:00.000Z'),
  due: new Date('2026-01-01T00:00:01.000Z'),
}

const provider = {
  jungle: 'jungle-provider',
}

const game = 'fortune-tiger'

const limit = 20

const attempt = {
  exhausted: 11,
}

class Suite {
  static orm: MikroORM

  static wallets: WalletRepository

  static wagers: WagerTransactionRepository

  static reader: ReferenceReader

  static writer: ReferenceRetryWriter
}

const openWallet = (playerId: string): Wallet => {
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

const processedBet = (wallet: Wallet, roundId: string): WagerTransaction => {
  const money = Money.from({ amount: amount.ten, currency: currency.brl })
  const input = {
    id: uuidv7(),
    providerId: provider.jungle,
    externalTransactionId: uuidv7(),
    idempotencyKey: `${provider.jungle}:${uuidv7()}`,
    payloadHash: 'payload-hash',
    walletId: wallet.id,
    playerId: wallet.playerId,
    roundId,
    gameId: game,
    kind: WagerTransactionKind.BET,
    money,
    referenceExternalTransactionId: undefined,
    createdAt: instant.open,
  }
  const wager = WagerTransaction.create(input)

  wager.markProcessed(undefined, instant.open)

  return wager
}

const waiting = (
  wallet: Wallet,
  referenceExternalTransactionId: string,
  roundId: string,
  attempts: number,
): WagerTransaction => {
  const money = Money.from({ amount: amount.ten, currency: currency.brl })
  const schema: Schema = {
    id: uuidv7(),
    providerId: provider.jungle,
    externalTransactionId: uuidv7(),
    idempotencyKey: `${provider.jungle}:${uuidv7()}`,
    payloadHash: 'payload-hash',
    walletId: wallet.id,
    playerId: wallet.playerId,
    roundId,
    gameId: game,
    kind: WagerTransactionKind.REFUND,
    money,
    referenceExternalTransactionId,
    createdAt: instant.open,
    status: WagerTransactionStatus.PENDING_REFERENCE,
    referenceTransactionId: undefined,
    failureCode: undefined,
    processedAt: undefined,
    attempts,
    nextAttemptAt: instant.due,
  }

  return WagerTransaction.rehydrate(schema)
}

const eventTypes = async (): Promise<Array<string>> => {
  const manager = Suite.orm.em.fork()
  const messages = await manager.find(OutboxMessageEntity, {})
  const toType = (message: OutboxMessageEntity) => message.eventType

  return messages.map(toType).sort()
}

beforeAll(async () => {
  Suite.orm = await PersistenceHarness.open()
  Suite.wallets = new WalletRepository(Suite.orm.em)
  Suite.wagers = new WagerTransactionRepository(Suite.orm.em)
  Suite.reader = new ReferenceReader(Suite.orm)
  Suite.writer = new ReferenceRetryWriter(
    Suite.orm,
    new ReferenceMediator(new WagerMediator()),
    new WagerEventsMapper(),
  )
})

beforeEach(async () => {
  await PersistenceHarness.reset(Suite.orm)
})

afterAll(async () => {
  await PersistenceHarness.close(Suite.orm)
})

describe('ReferenceRetryWriter', () => {
  test('WHEN the reference is due SHOULD schedule the next retry without an event', async () => {
    const wallet = openWallet(uuidv7())
    const wager = waiting(wallet, uuidv7(), uuidv7(), 0)

    await Suite.wallets.save(wallet)
    await Suite.wagers.save(wager)

    const due = await Suite.reader.due(instant.due, limit)
    const output = await Suite.writer.retry(wager.id, instant.due)
    const manager = Suite.orm.em.fork()
    const stored = await new WagerTransactionRepository(manager).findById(wager.id)
    const messages = await eventTypes()

    expect(due).toEqual([wager.id])
    expect(output?.status).toBe(WagerTransactionStatus.PENDING_REFERENCE)
    expect(stored?.attempts).toBe(1)
    expect(stored?.nextAttemptAt).toEqual(new Date(instant.due.getTime() + 1_000))
    expect(messages).toEqual([])
  })

  test('WHEN the reference arrives SHOULD process the wager and publish', async () => {
    const wallet = openWallet(uuidv7())
    const roundId = uuidv7()
    const reference = processedBet(wallet, roundId)
    const wager = waiting(wallet, reference.externalTransactionId, roundId, 0)

    await Suite.wallets.save(wallet)
    await Suite.wagers.save(reference)
    await Suite.wagers.save(wager)

    const output = await Suite.writer.retry(wager.id, instant.due)
    const manager = Suite.orm.em.fork()
    const stored = await new WagerTransactionRepository(manager).findById(wager.id)
    const storedWallet = await new WalletRepository(manager).findById(wallet.id)
    const ledgers = await manager.count(WalletLedgerEntity, {})
    const messages = await eventTypes()

    expect(output?.status).toBe(WagerTransactionStatus.PROCESSED)
    expect(stored?.referenceTransactionId).toBe(reference.id)
    expect(storedWallet?.balance.amount).toBe(amount.hundredTen)
    expect(ledgers).toBe(1)
    expect(messages).toEqual(['WagerTransactionProcessed', 'WalletBalanceChanged'])
  })

  test('WHEN the attempts are exhausted SHOULD reject and publish', async () => {
    const wallet = openWallet(uuidv7())
    const wager = waiting(wallet, uuidv7(), uuidv7(), attempt.exhausted)

    await Suite.wallets.save(wallet)
    await Suite.wagers.save(wager)

    const output = await Suite.writer.retry(wager.id, instant.due)
    const manager = Suite.orm.em.fork()
    const stored = await new WagerTransactionRepository(manager).findById(wager.id)
    const messages = await eventTypes()

    expect(output?.status).toBe(WagerTransactionStatus.REJECTED)
    expect(stored?.failureCode).toBe(FailureCode.REFERENCE_NOT_FOUND)
    expect(stored?.nextAttemptAt).toBeUndefined()
    expect(messages).toEqual(['WagerTransactionRejected'])
  })

  test('WHEN the wager is terminal SHOULD return nothing', async () => {
    const wallet = openWallet(uuidv7())
    const wager = processedBet(wallet, uuidv7())

    await Suite.wallets.save(wallet)
    await Suite.wagers.save(wager)

    const output = await Suite.writer.retry(wager.id, instant.due)
    const messages = await eventTypes()

    expect(output).toBeUndefined()
    expect(messages).toEqual([])
  })
})
