import { WagerTransactionPendingReference } from '../events'
import { OutboxMessage } from '../messages'
import type { WagerProjectionProtocol } from './wager.projection.protocol'
import type { WagerProjectionType } from './types'

type Input = WagerProjectionType.Input
type Output = WagerProjectionType.Output

export class PendingReferenceProjection implements WagerProjectionProtocol {
  project(input: Input): Output {
    const pending = WagerTransactionPendingReference.from(input.wager, input.context)
    const message = OutboxMessage.enqueue(pending)

    return [message]
  }
}
