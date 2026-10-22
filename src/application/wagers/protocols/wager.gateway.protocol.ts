import type { WagerTransaction } from '@domain/wager/wager'
import type { WagersType } from '../types'

type SubmitOutput = WagersType.SubmitOutput
type QueueInbox = WagersType.QueueInbox

export interface WagerGatewayProtocol {
  submit(wager: WagerTransaction, at: Date, inbox?: QueueInbox): Promise<SubmitOutput>
}
