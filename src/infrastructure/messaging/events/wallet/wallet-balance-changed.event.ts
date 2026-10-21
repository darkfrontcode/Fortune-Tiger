import type { Ledger } from '../../../../domain/ledger/ledger'
import type { Wallet } from '../../../../domain/wallet/wallet'
import { IntegrationEvent } from '../integration-event'
import type { IntegrationEventType } from '../types'
import type { WalletEventType } from './types'

type Context = IntegrationEventType.Context
type Data = WalletEventType.BalanceChangedData
type Input = IntegrationEventType.Input<Data>

const event = {
  type: 'WalletBalanceChanged',
  version: 1,
}

export class WalletBalanceChanged extends IntegrationEvent<Data> {
  readonly eventType = event.type
  readonly version = event.version

  private constructor(input: Input) {
    super(input)
  }

  static from(wallet: Wallet, ledger: Ledger, context: Context): WalletBalanceChanged {
    const aggregateId = wallet.id
    const correlationId = context.correlationId
    const causationId = context.causationId
    const occurredAt = context.occurredAt
    const money = ledger.money.toJSON()
    const balanceBefore = ledger.balanceBefore.toJSON()
    const balanceAfter = ledger.balanceAfter.toJSON()
    const data = {
      walletId: wallet.id,
      transactionId: ledger.transactionId,
      direction: ledger.direction,
      money,
      balanceBefore,
      balanceAfter,
      walletVersion: wallet.version,
    }
    const input = { aggregateId, correlationId, causationId, occurredAt, data }

    return new WalletBalanceChanged(input)
  }
}
