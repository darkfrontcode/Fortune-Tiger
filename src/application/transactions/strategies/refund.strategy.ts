import type { Ledger } from '../../../domain/ledger'
import { REFERENCE_REQUIRED_MESSAGE } from '../../../domain/wager/data'
import { WagerTransactionKind } from '../../../domain/wager'
import type { WagerTransaction } from '../../../domain/wager'
import type { WagerStrategyProtocol } from '../../protocols'
import type { TransactionsType } from '../types'
import { WagerMove } from '../wager.move'

type Mediation = TransactionsType.Mediation

export class RefundStrategy implements WagerStrategyProtocol {
  readonly kind = WagerTransactionKind.REFUND

  execute(wager: WagerTransaction, mediation: Mediation): Ledger | undefined {
    const reference = mediation.reference

    if (reference === undefined) {
      const message = REFERENCE_REQUIRED_MESSAGE

      throw new Error(message)
    }

    return WagerMove.credit(
      wager,
      mediation.wallet,
      mediation.ledgerId,
      mediation.at,
      reference.id,
    )
  }
}
