import type { Ledger } from '@domain/ledger'
import { WagerTransactionKind } from '@domain/wager'
import type { WagerTransaction } from '@domain/wager'
import type { WagerStrategyProtocol } from '../../protocols'
import type { WagersType } from '../../types'
import type { WagerMovesService } from '../../services'

type Mediation = WagersType.Mediation

export class WinOption implements WagerStrategyProtocol {
  readonly kind = WagerTransactionKind.WIN

  constructor(private readonly moves: WagerMovesService) {}

  execute(wager: WagerTransaction, mediation: Mediation): Ledger | undefined {
    const reference = mediation.reference
    const link = reference === undefined ? undefined : reference.id

    return this.moves.credit(wager, mediation.wallet, mediation.ledgerId, mediation.at, link)
  }
}
