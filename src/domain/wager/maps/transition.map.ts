import { MISSING_TRANSITION_MESSAGE } from '../data'
import { WagerTransactionStatus } from '../enums'

const closed: WagerTransactionStatus[] = []

const pending = [
  WagerTransactionStatus.PENDING_REFERENCE,
  WagerTransactionStatus.PROCESSED,
  WagerTransactionStatus.REJECTED,
  WagerTransactionStatus.FAILED,
]

const waiting = [
  WagerTransactionStatus.PROCESSED,
  WagerTransactionStatus.REJECTED,
  WagerTransactionStatus.FAILED,
]

export class TransitionMap extends Map<WagerTransactionStatus, Array<WagerTransactionStatus>> {
  constructor() {
    super([
      [WagerTransactionStatus.PENDING, pending],
      [WagerTransactionStatus.PENDING_REFERENCE, waiting],
      [WagerTransactionStatus.PROCESSED, closed],
      [WagerTransactionStatus.REJECTED, closed],
      [WagerTransactionStatus.FAILED, closed],
    ])
  }

  get(status: WagerTransactionStatus): Array<WagerTransactionStatus> {
    const targets = super.get(status)

    if (targets === undefined) {
      const message = MISSING_TRANSITION_MESSAGE

      throw new Error(message)
    }

    return targets
  }
}
