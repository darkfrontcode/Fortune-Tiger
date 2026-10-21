import type { WagerTransaction } from '../../domain/wager/wager'
import type { TransactionsType } from '../transactions/wager'

type SubmitOutput = TransactionsType.SubmitOutput

export interface WagerGatewayProtocol {
  submit(wager: WagerTransaction, at: Date): Promise<SubmitOutput>
}
