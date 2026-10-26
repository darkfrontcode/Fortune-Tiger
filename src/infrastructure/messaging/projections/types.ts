import type { Ledger } from '@domain/ledger/ledger'
import type { Wallet } from '@domain/wallet/wallet'
import type { WagerTransaction } from '@domain/wager/wager'
import type { IntegrationEventType } from '../events'
import type { OutboxMessage } from '../messages'

export namespace WagerProjectionType {
  export type Context = IntegrationEventType.Context

  export interface Input {
    wager: WagerTransaction
    wallet: Wallet
    ledger: Ledger | undefined
    context: Context
  }

  export type Output = Array<OutboxMessage>
}
