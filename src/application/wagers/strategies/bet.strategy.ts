import type { Ledger } from '@domain/ledger'
import { FailureCode, WagerTransactionKind } from '@domain/wager'
import type { WagerTransaction } from '@domain/wager'
import type { WagerStrategyProtocol } from '../protocols'
import type { WagersType } from '../types'
import { WagerMove } from '../wager.move'

type Mediation = WagersType.Mediation

export class BetStrategy implements WagerStrategyProtocol {
  readonly kind = WagerTransactionKind.BET

  execute(wager: WagerTransaction, mediation: Mediation): Ledger | undefined {
    const code = FailureCode.INSUFFICIENT_FUNDS

    return WagerMove.debit(
      wager,
      mediation.wallet,
      mediation.ledgerId,
      mediation.at,
      undefined,
      code,
    )
  }
}
