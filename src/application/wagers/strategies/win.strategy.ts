import type { Ledger } from '@domain/ledger'
import { WagerTransactionKind } from '@domain/wager'
import type { WagerTransaction } from '@domain/wager'
import type { WagerStrategyProtocol } from '../protocols'
import type { WagersType } from '../types'
import { WagerMove } from '../wager.move'

type Mediation = WagersType.Mediation

export class WinStrategy implements WagerStrategyProtocol {
  readonly kind = WagerTransactionKind.WIN

  execute(wager: WagerTransaction, mediation: Mediation): Ledger | undefined {
    const reference = mediation.reference
    const link = reference === undefined ? undefined : reference.id

    return WagerMove.credit(wager, mediation.wallet, mediation.ledgerId, mediation.at, link)
  }
}
