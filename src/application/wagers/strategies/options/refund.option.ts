import type { Ledger } from '@domain/ledger'
import { REFERENCE_REQUIRED_MESSAGE } from '@domain/wager/data'
import { WagerTransactionKind } from '@domain/wager'
import type { WagerTransaction } from '@domain/wager'
import type { WagerStrategyProtocol } from '../../protocols'
import type { WagersType } from '../../types'
import type { WagerMovesService } from '../../services'

type Mediation = WagersType.Mediation

export class RefundOption implements WagerStrategyProtocol {
  readonly kind = WagerTransactionKind.REFUND

  constructor(private readonly moves: WagerMovesService) {}

  execute(wager: WagerTransaction, mediation: Mediation): Ledger | undefined {
    const reference = mediation.reference

    if (reference === undefined) {
      const message = REFERENCE_REQUIRED_MESSAGE

      throw new Error(message)
    }

    return this.moves.credit(
      wager,
      mediation.wallet,
      mediation.ledgerId,
      mediation.at,
      reference.id,
    )
  }
}
