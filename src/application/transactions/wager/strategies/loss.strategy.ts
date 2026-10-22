import type { Ledger } from '@domain/ledger'
import { WagerTransactionKind } from '@domain/wager'
import type { WagerTransaction } from '@domain/wager'
import type { WagerStrategyProtocol } from '../../../protocols'
import type { TransactionsType } from '../types'

type Mediation = TransactionsType.Mediation

export class LossStrategy implements WagerStrategyProtocol {
  readonly kind = WagerTransactionKind.LOSS

  execute(wager: WagerTransaction, mediation: Mediation): Ledger | undefined {
    wager.markProcessed(undefined, mediation.at)

    return undefined
  }
}
