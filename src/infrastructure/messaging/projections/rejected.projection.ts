import { WagerTransactionRejected } from '../events'
import { OutboxMessage } from '../messages'
import type { WagerProjectionProtocol } from './wager.projection.protocol'
import type { WagerProjectionType } from './types'

type Input = WagerProjectionType.Input
type Output = WagerProjectionType.Output

export class RejectedProjection implements WagerProjectionProtocol {
  project(input: Input): Output {
    const rejected = WagerTransactionRejected.from(input.wager, input.context)
    const message = OutboxMessage.enqueue(rejected)

    return [message]
  }
}
