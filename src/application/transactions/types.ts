import type { Wallet } from '../../domain/wallet/wallet'
import type { FailureCode } from '../../domain/wager/enums'
import type { WagerTransaction } from '../../domain/wager/wager'

export namespace TransactionsType {
  export type Hold = {
    waiting: boolean
    code: FailureCode | undefined
  }

  export type Mediation = {
    wallet: Wallet
    reference: WagerTransaction | undefined
    reversed: boolean
    ledgerId: string
    at: Date
  }
}
