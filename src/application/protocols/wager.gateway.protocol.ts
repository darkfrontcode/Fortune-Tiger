import type { WagerTransaction } from '@domain/wager/wager'
import type { TransactionsType } from '../transactions/wager'

type SubmitOutput = TransactionsType.SubmitOutput
type QueueInbox = TransactionsType.QueueInbox

export interface WagerGatewayProtocol {
  submit(wager: WagerTransaction, at: Date, inbox?: QueueInbox): Promise<SubmitOutput>
}
