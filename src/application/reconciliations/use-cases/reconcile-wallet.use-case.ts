import { Inject, Injectable } from '@nestjs/common'
import type { LoggerProtocol, MetricProtocol, ReconciliationGatewayProtocol } from '../../protocols'
import { LOGGER, METRIC } from '../../dependencies/tokens'
import { RECONCILIATION_GATEWAY } from '../tokens'
import { RECONCILIATION_DIVERGENCE_MESSAGE } from '../data'
import { LedgerBalancePattern } from '../patterns'
import { ReconciliationsType } from '../types'
import { WalletReconciliationNotFoundError } from './wallet-reconciliation-not-found.error'

type Snapshot = ReconciliationsType.Snapshot
type CompareOutput = ReconciliationsType.CompareOutput
type Input = { walletId: string }
type Output = Promise<CompareOutput>

const reconciliationMetric = {
  divergence: 'reconciliation_divergence',
}

@Injectable()
export class ReconcileWalletUseCase {
  private readonly balance = new LedgerBalancePattern()

  constructor(
    @Inject(RECONCILIATION_GATEWAY) private readonly gateway: ReconciliationGatewayProtocol,
    @Inject(LOGGER) private readonly logger: LoggerProtocol,
    @Inject(METRIC) private readonly metric: MetricProtocol,
  ) {}

  async execute(input: Input): Output {
    const { walletId } = input
    const snapshot = await this.gateway.load(walletId)

    const missing = snapshot === undefined

    if (missing) { throw new WalletReconciliationNotFoundError(walletId) }

    return this.compare(walletId, snapshot)
  }

  private compare(walletId: string, snapshot: Snapshot): CompareOutput {
    const stored = snapshot.stored
    const currency = stored.currency
    const ledgers = snapshot.ledgers
    const calculated = this.balance.test({ currency, ledgers })
    const difference = stored.subtract(calculated)
    const consistent = difference.isZero()
    const ledgerCount = ledgers.length
    const storedBalance = stored.toJSON()
    const calculatedBalance = calculated.toJSON()
    const differenceBalance = difference.toJSON()
    const output: CompareOutput = {
      walletId,
      storedBalance,
      calculatedBalance,
      difference: differenceBalance,
      consistent,
      checkedEntries: ledgerCount,
    }

    if (consistent) { return output }

    const message = `${RECONCILIATION_DIVERGENCE_MESSAGE}: ${walletId}`

    this.logger.warn(message)
    this.metric.increment(reconciliationMetric.divergence)

    return output
  }
}
