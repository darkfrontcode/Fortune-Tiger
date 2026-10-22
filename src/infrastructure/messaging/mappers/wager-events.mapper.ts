import { Injectable } from '@nestjs/common'
import type { MapperProtocol } from '../../../application/protocols'
import type { Ledger } from '../../../domain/ledger/ledger'
import type { Wallet } from '../../../domain/wallet/wallet'
import { WagerTransactionStatus } from '../../../domain/wager/enums'
import type { WagerTransaction } from '../../../domain/wager/wager'
import {
  WagerTransactionPendingReference,
  WagerTransactionProcessed,
  WagerTransactionRejected,
  WalletBalanceChanged,
} from '../events'
import type { IntegrationEventType } from '../events'
import { OutboxMessage } from '../messages'

type Context = IntegrationEventType.Context

type Input = {
  wager: WagerTransaction
  wallet: Wallet
  ledger: Ledger | undefined
  context: Context
}

type Output = Array<OutboxMessage>

@Injectable()
export class WagerEventsMapper implements MapperProtocol<Input, Output> {
  map(input: Input): Output {
    const { wager, wallet, ledger, context } = input
    const status = wager.status

    if (status === WagerTransactionStatus.REJECTED) {
      const rejected = WagerTransactionRejected.from(wager, context)
      const message = OutboxMessage.enqueue(rejected)

      return [message]
    }

    if (status === WagerTransactionStatus.PENDING_REFERENCE) {
      const pending = WagerTransactionPendingReference.from(wager, context)
      const message = OutboxMessage.enqueue(pending)

      return [message]
    }

    if (status !== WagerTransactionStatus.PROCESSED) { return new Array<OutboxMessage>() }

    const processed = WagerTransactionProcessed.from(wager, context)
    const processedMessage = OutboxMessage.enqueue(processed)
    const messages = [processedMessage]

    if (ledger === undefined) { return messages }

    const changed = WalletBalanceChanged.from(wallet, ledger, context)
    const changedMessage = OutboxMessage.enqueue(changed)

    return messages.concat(changedMessage)
  }
}
