import { Inject, Injectable } from '@nestjs/common'
import { FailureCode } from '@domain/wager/enums'
import type { LoggerProtocol, MetricProtocol, ReconciliationGatewayProtocol } from '../protocols'
import { LOGGER, METRIC, RECONCILIATION_GATEWAY } from '../tokens'
import { RECONCILIATION_DIVERGENCE_MESSAGE } from './data'
import { LedgerBalancePattern } from './patterns'
import { ReconciliationsType } from './types'

type Snapshot = ReconciliationsType.Snapshot
type Output = ReconciliationsType.Output
type CompareOutput = ReconciliationsType.CompareOutput
type MissingOutput = ReconciliationsType.MissingOutput

const reconciliationMetric = {
  divergence: 'reconciliation_divergence',
}

@Injectable()
export class ReconciliationService {
  private readonly balance = new LedgerBalancePattern()

  constructor(
    @Inject(RECONCILIATION_GATEWAY) private readonly gateway: ReconciliationGatewayProtocol,
    @Inject(LOGGER) private readonly logger: LoggerProtocol,
    @Inject(METRIC) private readonly metric: MetricProtocol,
  ) {}

  async reconcile(walletId: string): Promise<Output> {
    const snapshot = await this.gateway.load(walletId)

    if (snapshot === undefined) { return ReconciliationService.missing(walletId) }

    return ReconciliationService.compare(walletId, snapshot, this.balance, this.logger, this.metric)
  }

  private static missing(walletId: string): MissingOutput {
    const failureCode = FailureCode.WALLET_NOT_FOUND

    return { walletId, failureCode }
  }

  private static compare(
    walletId: string,
    snapshot: Snapshot,
    balance: LedgerBalancePattern,
    logger: LoggerProtocol,
    metric: MetricProtocol,
  ): CompareOutput {
    const stored = snapshot.stored
    const currency = stored.currency
    const ledgers = snapshot.ledgers
    const calculated = balance.test({ currency, ledgers })
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

    logger.warn(message)
    metric.increment(reconciliationMetric.divergence)

    return output
  }
}
