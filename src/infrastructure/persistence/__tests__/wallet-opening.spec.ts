import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { MikroORM } from '@mikro-orm/postgresql'
import { uuidv7 } from 'uuidv7'
import { IdempotencyService } from '../../../application/idempotencies/idempotency.service'
import { WagerMediator } from '../../../application/transactions/wager/mediators/wager.mediator'
import { LedgerDirection } from '../../../domain/ledger/enums'
import { Money } from '../../../domain/money/money'
import { WagerTransactionKind, WagerTransactionStatus } from '../../../domain/wager/enums'
import { WALLET_PLAYER_CURRENCY_CONFLICT_MESSAGE } from '../data'
import { WalletLedgerRepository } from '../ledger/wallet-ledger.repository'
import { WagerTransactionRepository } from '../wager/wager-transaction.repository'
import { WalletOpeningWriter } from '../wallet/wallet-opening.writer'
import { WalletRepository } from '../wallet/wallet.repository'
import { PersistenceHarness } from './persistence.harness'

const currency = {
  brl: 'BRL',
}

const amount = {
  zero: '0.00',
  hundred: '100.00',
}

const instant = {
  open: new Date('2026-01-01T00:00:00.000Z'),
}

const scope = {
  provider: 'fortune-tiger',
}

const revision = {
  open: 1,
  credited: 2,
}

class Suite {
  static orm!: MikroORM

  static wallets!: WalletRepository

  static wagers!: WagerTransactionRepository

  static ledger!: WalletLedgerRepository

  static writer!: WalletOpeningWriter
}

beforeAll(async () => {
  Suite.orm = await PersistenceHarness.open()
  Suite.wallets = new WalletRepository(Suite.orm.em)
  Suite.wagers = new WagerTransactionRepository(Suite.orm.em)
  Suite.ledger = new WalletLedgerRepository(Suite.orm.em)
  Suite.writer = new WalletOpeningWriter(Suite.orm, new IdempotencyService(), new WagerMediator())
})

beforeEach(async () => {
  await PersistenceHarness.reset(Suite.orm)
})

afterAll(async () => {
  await PersistenceHarness.close(Suite.orm)
})

describe('Wallet opening', () => {
  test('WHEN the initial balance is above zero SHOULD persist opening and credit', async () => {
    const playerId = uuidv7()
    const initialBalance = Money.from({ amount: amount.hundred, currency: currency.brl })
    const input = {
      playerId,
      initialBalance,
      openedAt: instant.open,
    }

    const wallet = await Suite.writer.open(input)

    Suite.orm.em.clear()

    const stored = await Suite.wagers.findByProviderAndExternal(scope.provider, `opening:${wallet.id}`)
    const rows = await Suite.ledger.listByWalletId(wallet.id)
    const balance = await Suite.wallets.findById(wallet.id)

    expect(balance?.balance.amount).toBe(amount.hundred)
    expect(balance?.version).toBe(revision.credited)
    expect(stored?.kind).toBe(WagerTransactionKind.OPENING)
    expect(stored?.status).toBe(WagerTransactionStatus.PROCESSED)
    expect(stored?.money.amount).toBe(amount.hundred)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.direction).toBe(LedgerDirection.CREDIT)
    expect(rows[0]?.balanceBefore.amount).toBe(amount.zero)
    expect(rows[0]?.balanceAfter.amount).toBe(amount.hundred)
  })

  test('WHEN the initial balance is zero SHOULD persist only the wallet', async () => {
    const playerId = uuidv7()
    const initialBalance = Money.zero(currency.brl)
    const input = {
      playerId,
      initialBalance,
      openedAt: instant.open,
    }

    const wallet = await Suite.writer.open(input)

    Suite.orm.em.clear()

    const rows = await Suite.ledger.listByWalletId(wallet.id)
    const balance = await Suite.wallets.findById(wallet.id)
    const opening = await Suite.wagers.findByProviderAndExternal(scope.provider, `opening:${wallet.id}`)

    expect(balance?.balance.amount).toBe(amount.zero)
    expect(balance?.version).toBe(revision.open)
    expect(rows).toHaveLength(0)
    expect(opening).toBeUndefined()
  })

  test('WHEN player and currency already exist SHOULD refuse the second open', async () => {
    const playerId = uuidv7()
    const initialBalance = Money.from({ amount: amount.hundred, currency: currency.brl })
    const input = {
      playerId,
      initialBalance,
      openedAt: instant.open,
    }

    await Suite.writer.open(input)

    const again = async () => {
      await Suite.writer.open(input)
    }

    const conflict = async () => {
      try {
        await again()
      } catch (error) {
        const message = error instanceof Error ? error.message : ''

        return message === WALLET_PLAYER_CURRENCY_CONFLICT_MESSAGE
      }

      return false
    }

    const refused = await conflict()

    expect(refused).toBe(true)
  })
})
