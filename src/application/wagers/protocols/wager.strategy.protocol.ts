import type { Ledger } from '@domain/ledger'
import type { WagerTransaction, WagerTransactionKind } from '@domain/wager'
import type { WagersType } from '../types'

type Mediation = WagersType.Mediation
type Output = Ledger | undefined

export interface WagerStrategyProtocol {
  readonly kind: WagerTransactionKind
  execute(wager: WagerTransaction, mediation: Mediation): Output
}
