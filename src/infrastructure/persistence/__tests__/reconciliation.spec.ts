import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { MikroORM } from '@mikro-orm/postgresql'
import { uuidv7 } from 'uuidv7'
import { ReconciliationService } from '../../../application/reconciliations/reconciliation.service'
import type { LoggerProtocol, MetricProtocol } from '../../../application/protocols'
import { Money } from '../../../domain/money/money'
import { WalletOpeningWriter } from '../wallet/wallet-opening.writer'
import { ReconciliationReader } from '../reconciliation/reconciliation.reader'
import { PersistenceHarness } from './persistence.harness'

const currency = {
  brl: 'BRL',
}

const amount = {
  hundred: '100.00',
}

const instant = {
  open: new Date('2026-01-01T00:00:00.000Z'),
}

class Logger implements LoggerProtocol {
  warn(_message: string): void {}
}

class Metric implements MetricProtocol {
  increment(_name: string): void {}
}

class Suite {
  static orm!: MikroORM

  static writer!: WalletOpeningWriter

  static service!: ReconciliationService
}

beforeAll(async () => {
  Suite.orm = await PersistenceHarness.open()
  Suite.writer = new WalletOpeningWriter(Suite.orm)
  const gateway = new ReconciliationReader(Suite.orm)
  const logger = new Logger()
  const metric = new Metric()

  Suite.service = new ReconciliationService(gateway, logger, metric)
})

beforeEach(async () => {
  await PersistenceHarness.reset(Suite.orm)
})

afterAll(async () => {
  await PersistenceHarness.close(Suite.orm)
})

describe('Reconciliation reader', () => {
  test('WHEN the wallet matches the ledger SHOULD report consistent', async () => {
    const playerId = uuidv7()
    const initialBalance = Money.from({ amount: amount.hundred, currency: currency.brl })
    const input = {
      playerId,
      initialBalance,
      openedAt: instant.open,
    }

    const wallet = await Suite.writer.open(input)

    Suite.orm.em.clear()

    const output = await Suite.service.reconcile(wallet.id)

    expect(output).toEqual({
      walletId: wallet.id,
      storedBalance: { amount: amount.hundred, currency: currency.brl },
      calculatedBalance: { amount: amount.hundred, currency: currency.brl },
      difference: { amount: '0.00', currency: currency.brl },
      consistent: true,
      checkedEntries: 1,
    })
  })
})
