import type { Ledger } from '@domain/ledger'
import { WagerTransactionKind } from '@domain/wager'
import type { WagerTransaction } from '@domain/wager'
import type { WagerStrategyProtocol } from '../protocols'
import type { WagersType } from '../types'
import { WagerMove } from '../wager.move'

type Mediation = WagersType.Mediation

export class OpeningStrategy implements WagerStrategyProtocol {
  readonly kind = WagerTransactionKind.OPENING

  execute(wager: WagerTransaction, mediation: Mediation): Ledger | undefined {
    return WagerMove.credit(wager, mediation.wallet, mediation.ledgerId, mediation.at, undefined)
  }
}
