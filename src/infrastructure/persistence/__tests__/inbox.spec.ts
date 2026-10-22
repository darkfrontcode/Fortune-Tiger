import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { MikroORM } from '@mikro-orm/postgresql'
import { uuidv7 } from 'uuidv7'
import { IdempotencyService } from '../../../application/idempotencies/idempotency.service'
import { WagerMediator } from '../../../application/transactions/wager/mediators/wager.mediator'
import { Money } from '../../../domain/money/money'
import { Wallet } from '../../../domain/wallet/wallet'
import { WagerTransactionKind, WagerTransactionStatus } from '../../../domain/wager/enums'
import { WagerTransaction } from '../../../domain/wager/wager'
import { WagerEventsMapper } from '../../messaging/mappers'
import { InboxMessageRepository } from '../inbox/inbox-message.repository'
import { WagerSubmitWriter } from '../wager/wager-submit.writer'
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
  processed: new Date('2026-01-01T00:00:01.000Z'),
}

const provider = {
  jungle: 'jungle-provider',
}

const consumer = {
  name: 'wager-transactions-consumer',
}

class Suite {
  static orm!: MikroORM

  static wallets!: WalletRepository

  static inbox!: InboxMessageRepository

  static writer!: WagerSubmitWriter
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
  const payloadHash = 'payload-hash-bet'
  const money = Money.from({ amount: amount.twenty, currency: currency.brl })
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
  Suite.inbox = new InboxMessageRepository(Suite.orm.em)
  Suite.writer = new WagerSubmitWriter(
    Suite.orm,
    new IdempotencyService(),
    new WagerEventsMapper(),
    new WagerMediator(),
  )
})

beforeEach(async () => {
  await PersistenceHarness.reset(Suite.orm)
})

afterAll(async () => {
  await PersistenceHarness.close(Suite.orm)
})

describe('Inbox persistence', () => {
  test('WHEN submit carries inbox SHOULD commit processed row with the wager', async () => {
    const wallet = openWallet(uuidv7())
    const external = uuidv7()
    const wager = pendingBet(wallet, external)
    const messageId = uuidv7()
    const envelope = {
      messageId,
      consumerName: consumer.name,
      receivedAt: instant.open,
    }

    await Suite.wallets.save(wallet)

    await Suite.writer.submit(wager, instant.processed, envelope)

    Suite.orm.em.clear()

    const stored = await Suite.inbox.find(consumer.name, messageId)
    const balance = await Suite.wallets.findById(wallet.id)

    expect(stored?.isProcessed()).toBe(true)
    expect(stored?.processedAt).toEqual(instant.processed)
    expect(stored?.payloadHash).toBe(wager.payloadHash)
    expect(balance?.balance.amount).toBe(amount.eighty)
  })

  test('WHEN the same queue message redelivers SHOULD replay without a second debit', async () => {
    const wallet = openWallet(uuidv7())
    const external = uuidv7()
    const wager = pendingBet(wallet, external)
    const messageId = uuidv7()
    const envelope = {
      messageId,
      consumerName: consumer.name,
      receivedAt: instant.open,
    }

    await Suite.wallets.save(wallet)

    const first = await Suite.writer.submit(wager, instant.processed, envelope)
    const secondWager = pendingBet(wallet, external)
    const second = await Suite.writer.submit(secondWager, instant.processed, envelope)

    Suite.orm.em.clear()

    const balance = await Suite.wallets.findById(wallet.id)

    expect(first.status).toBe(WagerTransactionStatus.PROCESSED)
    expect(second.idempotentReplay).toBe(true)
    expect(second.balance).toBe(first.balance)
    expect(balance?.balance.amount).toBe(amount.eighty)
  })
})
