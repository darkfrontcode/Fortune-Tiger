import { LedgerDirection } from '../../ledger/enums'
import { MISSING_DIRECTION_MESSAGE } from '../data'
import { WagerTransactionKind } from '../enums'

export class DirectionMap extends Map<WagerTransactionKind, LedgerDirection> {
  constructor() {
    super([
      [WagerTransactionKind.BET, LedgerDirection.DEBIT],
      [WagerTransactionKind.WIN, LedgerDirection.CREDIT],
      [WagerTransactionKind.REFUND, LedgerDirection.CREDIT],
    ])
  }

  get(kind: WagerTransactionKind): LedgerDirection {
    const posted = super.get(kind)

    if (posted === undefined) {
      const message = MISSING_DIRECTION_MESSAGE

      throw new Error(message)
    }

    return posted
  }

  inverse(kind: WagerTransactionKind): LedgerDirection {
    const posted = this.get(kind)
    const debit = posted === LedgerDirection.DEBIT

    if (debit) { return LedgerDirection.CREDIT }

    return LedgerDirection.DEBIT
  }
}
