import type { Ledger } from '@domain/ledger'
import { WagerTransactionKind } from '@domain/wager'
import type { WagerTransaction } from '@domain/wager'
import type { WagerStrategyProtocol } from '../../protocols'
import type { WagersType } from '../../types'
import type { WagerMovesService } from '../../services'

type Mediation = WagersType.Mediation

export class OpeningOption implements WagerStrategyProtocol {
  readonly kind = WagerTransactionKind.OPENING

  constructor(private readonly moves: WagerMovesService) {}

  execute(wager: WagerTransaction, mediation: Mediation): Ledger | undefined {
    return this.moves.credit(wager, mediation.wallet, mediation.ledgerId, mediation.at, undefined)
  }
}
