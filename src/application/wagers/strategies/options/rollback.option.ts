import type { Ledger } from '@domain/ledger'
import { LedgerDirection } from '@domain/ledger/enums'
import { REFERENCE_REQUIRED_MESSAGE } from '@domain/wager/data'
import { FailureCode, WagerTransactionKind } from '@domain/wager'
import { DirectionMap } from '@domain/wager/maps'
import type { WagerTransaction } from '@domain/wager'
import type { WagerStrategyProtocol } from '../../protocols'
import type { WagersType } from '../../types'
import type { WagerMovesService } from '../../services'

type Mediation = WagersType.Mediation

const directions = new DirectionMap()

export class RollbackOption implements WagerStrategyProtocol {
  readonly kind = WagerTransactionKind.ROLLBACK

  constructor(private readonly moves: WagerMovesService) {}

  execute(wager: WagerTransaction, mediation: Mediation): Ledger | undefined {
    const reference = mediation.reference

    if (reference === undefined) {
      const message = REFERENCE_REQUIRED_MESSAGE

      throw new Error(message)
    }

    const inverse = directions.inverse(reference.kind)
    const credit = inverse === LedgerDirection.CREDIT

    if (credit) {
      return this.moves.credit(
        wager,
        mediation.wallet,
        mediation.ledgerId,
        mediation.at,
        reference.id,
      )
    }

    const code = FailureCode.REVERSAL_INSUFFICIENT_FUNDS

    return this.moves.debit(
      wager,
      mediation.wallet,
      mediation.ledgerId,
      mediation.at,
      reference.id,
      code,
    )
  }
}
