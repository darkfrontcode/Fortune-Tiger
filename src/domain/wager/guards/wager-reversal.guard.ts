
import { WagerTransactionKind } from '../enums'

type Input = WagerTransactionKind
type Output = boolean

export class WagerReversalGuard {
  guard(input: Input): Output {
    const refund = input === WagerTransactionKind.REFUND
    const rollback = input === WagerTransactionKind.ROLLBACK

    return refund || rollback
  }
}
