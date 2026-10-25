import type { ConsumerOutcome } from './enums'
import type { ConsumerType } from './types'

export interface ConsumerProtocol {
  consume(input: ConsumerType.ConsumeInput): Promise<ConsumerOutcome>
}
