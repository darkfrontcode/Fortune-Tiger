import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { MikroORM } from '@mikro-orm/postgresql'
import { uuidv7 } from 'uuidv7'
import { IdempotencyService } from '@application/idempotencies/idempotency.service'
import { WagerMediator } from '@application/wagers/mediators'
import { FailureCode } from '@domain/wager/enums'
import { WagerTransactionKind, WagerTransactionStatus } from '@domain/wager/enums'
import { Money } from '@domain/money/money'
import { Wallet } from '@domain/wallet/wallet'
import { WagerTransaction } from '@domain/wager/wager'
import { WagerEventsMapper } from '../../messaging/mappers'
import { WagerSubmitWriter } from '../wager/wager-submit.writer'
import { WalletRepository } from '../wallet/wallet.repository'
import { PersistenceHarness } from './persistence.harness'

const currency = {
  brl: 'BRL',
}

const amount = {
  hundred: '100.00',
  one: '1.00',
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

const pendingBet = (
  wallet: Wallet,
  externalTransactionId: string,
  idempotencyKey: string,
  payloadHash: string,
) => {
  const id = uuidv7()
  const money = Money.from({ amount: amount.one, currency: currency.brl })
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

describe('Idempotency race', () => {
  test('WHEN the same key races on two wallets SHOULD keep one row and surface conflict', async () => {
    const key = `${provider.jungle}:${uuidv7()}`
    const walletOne = openWallet(uuidv7())
    const walletTwo = openWallet(uuidv7())

    await Suite.wallets.save(walletOne)
    await Suite.wallets.save(walletTwo)

    const first = pendingBet(walletOne, uuidv7(), key, 'hash-a')
    const second = pendingBet(walletTwo, uuidv7(), key, 'hash-b')
    const firstSubmit = Suite.writer.submit(first, instant.processed)
    const secondSubmit = Suite.writer.submit(second, instant.processed)
    const [firstResult, secondResult] = await Promise.all([firstSubmit, secondSubmit])

    Suite.orm.em.clear()

    const count = await Suite.orm.em.getConnection().execute(
      'select count(*)::int as total from wager_transactions where idempotency_key = ?',
      [key],
    )
    const total = count[0]?.total as number
    const outcomes = [firstResult, secondResult]
    const applied = outcomes.filter(
      (outcome) => outcome.status === WagerTransactionStatus.PROCESSED
        && outcome.failureCode === undefined,
    )
    const conflicts = outcomes.filter(
      (outcome) => outcome.failureCode === FailureCode.IDEMPOTENCY_PAYLOAD_CONFLICT,
    )

    expect(total).toBe(1)
    expect(applied).toHaveLength(1)
    expect(conflicts).toHaveLength(1)
  })
})
