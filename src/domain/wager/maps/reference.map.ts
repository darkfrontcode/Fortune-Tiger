import { MISSING_REFERENCE_MESSAGE } from '../data'
import { WagerTransactionKind } from '../enums'

const none = new Array<WagerTransactionKind>()

const bet: Array<WagerTransactionKind> = [WagerTransactionKind.BET]

const reversal: Array<WagerTransactionKind> = [
  WagerTransactionKind.BET,
  WagerTransactionKind.WIN,
  WagerTransactionKind.REFUND,
]

export class ReferenceMap extends Map<WagerTransactionKind, Array<WagerTransactionKind>> {
  constructor() {
    super([
      [WagerTransactionKind.OPENING, none],
      [WagerTransactionKind.BET, none],
      [WagerTransactionKind.WIN, bet],
      [WagerTransactionKind.LOSS, none],
      [WagerTransactionKind.REFUND, bet],
      [WagerTransactionKind.ROLLBACK, reversal],
    ])
  }

  get(kind: WagerTransactionKind): Array<WagerTransactionKind> {
    const allowed = super.get(kind)

    if (allowed === undefined) {
      const message = MISSING_REFERENCE_MESSAGE

      throw new Error(message)
    }

    return allowed
  }
}
