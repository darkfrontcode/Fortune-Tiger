import {
  REFERENCE_REQUIRED_MESSAGE,
  STATUS_TRANSITION_MESSAGE,
  TERMINAL_STATUS_MESSAGE,
} from './data'
import { WagerTransactionKind, WagerTransactionStatus } from './enums'
import { TransitionMap } from './maps'

const none = 0

const transition = new TransitionMap()

export class WagerGuard {
  static referenced(kind: WagerTransactionKind): boolean {
    const refund = kind === WagerTransactionKind.REFUND
    const rollback = kind === WagerTransactionKind.ROLLBACK

    return refund || rollback
  }

  static reference(kind: WagerTransactionKind, reference: string | undefined): void {
    const required = WagerGuard.referenced(kind)
    const empty = reference === undefined || reference === String()
    const missing = required && empty
    const message = REFERENCE_REQUIRED_MESSAGE

    if (missing) { throw new Error(message) }
  }

  static terminal(status: WagerTransactionStatus): boolean {
    const targets = transition.get(status)
    const empty = targets.length === none

    return empty
  }

  static move(status: WagerTransactionStatus, target: WagerTransactionStatus): void {
    const closedStatus = WagerGuard.terminal(status)

    if (closedStatus) {
      const message = TERMINAL_STATUS_MESSAGE

      throw new Error(message)
    }

    const targets = transition.get(status)
    const allowed = targets.includes(target)

    if (allowed) { return }

    const message = STATUS_TRANSITION_MESSAGE

    throw new Error(message)
  }
}
