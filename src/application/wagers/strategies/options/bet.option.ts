import type { Ledger } from '@domain/ledger'
import { FailureCode, WagerTransactionKind } from '@domain/wager'
import type { WagerTransaction } from '@domain/wager'
import type { WagerStrategyProtocol } from '../../protocols'
import type { WagersType } from '../../types'
import type { WagerMovesService } from '../../services'

type Mediation = WagersType.Mediation

export class BetOption implements WagerStrategyProtocol {
  readonly kind = WagerTransactionKind.BET

  constructor(private readonly moves: WagerMovesService) {}

  execute(wager: WagerTransaction, mediation: Mediation): Ledger | undefined {
    const code = FailureCode.INSUFFICIENT_FUNDS

    return this.moves.debit(
      wager,
      mediation.wallet,
      mediation.ledgerId,
      mediation.at,
      undefined,
      code,
    )
  }
}
