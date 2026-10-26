import { WagerTransactionProcessed } from '../events'
import { WalletBalanceChanged } from '../events'
import { OutboxMessage } from '../messages'
import type { WagerProjectionProtocol } from './wager.projection.protocol'
import type { WagerProjectionType } from './types'

type Input = WagerProjectionType.Input
type Output = WagerProjectionType.Output

export class ProcessedProjection implements WagerProjectionProtocol {
  project(input: Input): Output {
    const processed = WagerTransactionProcessed.from(input.wager, input.context)
    const processedMessage = OutboxMessage.enqueue(processed)
    const messages = [processedMessage]

    if (input.ledger === undefined) { return messages }

    const changed = WalletBalanceChanged.from(input.wallet, input.ledger, input.context)
    const changedMessage = OutboxMessage.enqueue(changed)

    return messages.concat(changedMessage)
  }
}
