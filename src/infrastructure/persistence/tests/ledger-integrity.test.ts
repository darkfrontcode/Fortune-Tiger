import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { MikroORM } from '@mikro-orm/postgresql'
import { uuidv7 } from 'uuidv7'
import { IdempotencyService } from '@application/idempotencies/idempotency.service'
import { WagerMediator } from '@application/wagers/mediators'
import { Money } from '@domain/money/money'
import { WalletOpeningWriter } from '../wallet/wallet-opening.writer'
import { PersistenceHarness } from './persistence.harness'
import { clock, journey } from './journey.stubs'

const currency = 'BRL'
const amount = '100.00'
const instant = new Date('2026-01-01T00:00:00.000Z')

const refuse = async (operation: () => Promise<unknown>) => {
  try {
    await operation()
    return false
  } catch {
    return true
  }
}

class Suite {
  static orm: MikroORM

  static writer: WalletOpeningWriter
}

beforeAll(async () => {
  Suite.orm = await PersistenceHarness.open()
  Suite.writer = new WalletOpeningWriter(Suite.orm, new IdempotencyService(), new WagerMediator(), clock, journey)
})

beforeEach(async () => {
  await PersistenceHarness.reset(Suite.orm)
})

afterAll(async () => {
  await PersistenceHarness.close(Suite.orm)
})

describe('Ledger database integrity', () => {
  test('WHEN a ledger row is mutated directly SHOULD refuse update and delete', async () => {
    const wallet = await Suite.writer.open({
      id: uuidv7(),
      playerId: uuidv7(),
      initialBalance: Money.from({ amount, currency }),
      openedAt: instant,
    })
    const connection = Suite.orm.em.getConnection()
    const row = await connection.execute<{ id: string }[]>(
      'select "id" from "wallet_ledger_entries" where "wallet_id" = ? limit 1',
      [wallet.id],
    )
    const ledgerId = row[0]?.id
    const updateRefused = await refuse(() =>
      connection.execute(
        'update "wallet_ledger_entries" set "amount" = ? where "id" = ?',
        ['99.00', ledgerId],
      ),
    )
    const deleteRefused = await refuse(() =>
      connection.execute('delete from "wallet_ledger_entries" where "id" = ?', [ledgerId]),
    )

    expect(ledgerId).toBeString()
    expect(updateRefused).toBe(true)
    expect(deleteRefused).toBe(true)
  })

  test('WHEN a ledger row references another transaction SHOULD refuse the insert', async () => {
    const wallet = await Suite.writer.open({
      id: uuidv7(),
      playerId: uuidv7(),
      initialBalance: Money.zero(currency),
      openedAt: instant,
    })
    const connection = Suite.orm.em.getConnection()
    const refused = await refuse(() =>
      connection.execute(
        `insert into "wallet_ledger_entries"
          ("id", "wallet_id", "transaction_id", "direction", "amount", "currency", "balance_before", "balance_after", "created_at")
         values (?, ?, ?, 'CREDIT', ?, ?, ?, ?, ?)`,
        [uuidv7(), wallet.id, uuidv7(), '1.00', currency, '0.00', '1.00', instant],
      ),
    )

    expect(refused).toBe(true)
  })
})
