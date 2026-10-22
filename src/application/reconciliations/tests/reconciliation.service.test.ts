import { describe, expect, test } from 'bun:test'
import { Money } from '@domain/money/money'
import { LedgerDirection } from '@domain/ledger/enums'
import { Ledger } from '@domain/ledger/ledger'
import { FailureCode } from '@domain/wager/enums'
import type { LoggerProtocol, MetricProtocol, ReconciliationGatewayProtocol } from '../../protocols'
import { ReconciliationService } from '../reconciliation.service'
import { ReconciliationsType } from '../types'

type Snapshot = ReconciliationsType.Snapshot

class Gateway implements ReconciliationGatewayProtocol {
  snapshot: Snapshot | undefined

  constructor(snapshot: Snapshot | undefined) {
    this.snapshot = snapshot
  }

  load(_walletId: string): Promise<Snapshot | undefined> {
    return Promise.resolve(this.snapshot)
  }
}

class Logger implements LoggerProtocol {
  readonly warnings: string[] = []

  warn(message: string): void {
    this.warnings.push(message)
  }
}

class Metric implements MetricProtocol {
  readonly counts = new Map<string, number>()

  increment(name: string): void {
    const value = this.counts.get(name) ?? 0
    const total = value + 1

    this.counts.set(name, total)
  }
}

const instant = new Date('2026-01-01T00:00:00.000Z')

const currency = 'BRL'

const ledgerFor = (
  direction: LedgerDirection,
  amount: string,
  balanceBefore: string,
  balanceAfter: string,
) => {
  const money = Money.from({ amount, currency })
  const before = Money.from({ amount: balanceBefore, currency })
  const after = Money.from({ amount: balanceAfter, currency })

  return Ledger.create({
    id: `ledger-${amount}-${direction}`,
    walletId: 'wallet-1',
    transactionId: `tx-${amount}-${direction}`,
    direction,
    money,
    balanceBefore: before,
    balanceAfter: after,
    createdAt: instant,
  })
}

describe('ReconciliationService', () => {
  test('missing - WHEN the wallet is absent SHOULD return WALLET_NOT_FOUND', async () => {
    const gateway = new Gateway(undefined)
    const logger = new Logger()
    const metric = new Metric()
    const service = new ReconciliationService(gateway, logger, metric)
    const output = await service.reconcile('wallet-1')

    expect(output).toEqual({
      walletId: 'wallet-1',
      failureCode: FailureCode.WALLET_NOT_FOUND,
    })
    expect(logger.warnings).toHaveLength(0)
    expect(metric.counts.size).toBe(0)
  })

  test('consistent - WHEN stored matches the ledger SHOULD report consistent', async () => {
    const stored = Money.from({ amount: '75.00', currency })
    const credit = ledgerFor(LedgerDirection.CREDIT, '100.00', '0.00', '100.00')
    const debit = ledgerFor(LedgerDirection.DEBIT, '25.00', '100.00', '75.00')
    const snapshot = { stored, ledgers: [credit, debit] }
    const gateway = new Gateway(snapshot)
    const logger = new Logger()
    const metric = new Metric()
    const service = new ReconciliationService(gateway, logger, metric)
    const output = await service.reconcile('wallet-1')

    expect(output).toEqual({
      walletId: 'wallet-1',
      storedBalance: { amount: '75.00', currency },
      calculatedBalance: { amount: '75.00', currency },
      difference: { amount: '0.00', currency },
      consistent: true,
      checkedEntries: 2,
    })
    expect(logger.warnings).toHaveLength(0)
    expect(metric.counts.size).toBe(0)
  })

  test('divergence - WHEN stored differs from the ledger SHOULD log and count', async () => {
    const stored = Money.from({ amount: '80.00', currency })
    const credit = ledgerFor(LedgerDirection.CREDIT, '100.00', '0.00', '100.00')
    const debit = ledgerFor(LedgerDirection.DEBIT, '25.00', '100.00', '75.00')
    const snapshot = { stored, ledgers: [credit, debit] }
    const gateway = new Gateway(snapshot)
    const logger = new Logger()
    const metric = new Metric()
    const service = new ReconciliationService(gateway, logger, metric)
    const output = await service.reconcile('wallet-1')

    expect(output).toEqual({
      walletId: 'wallet-1',
      storedBalance: { amount: '80.00', currency },
      calculatedBalance: { amount: '75.00', currency },
      difference: { amount: '5.00', currency },
      consistent: false,
      checkedEntries: 2,
    })
    expect(logger.warnings).toHaveLength(1)
    expect(metric.counts.get('reconciliation_divergence')).toBe(1)
  })
})
