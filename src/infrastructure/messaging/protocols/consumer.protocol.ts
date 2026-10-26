import type { ConsumerOutcome } from '../enums'
import type { ConsumerType } from '../queues'

export interface ConsumerProtocol {
  consume(input: ConsumerType.ConsumeInput): Promise<ConsumerOutcome>
}
