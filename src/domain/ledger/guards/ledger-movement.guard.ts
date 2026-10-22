
import { LedgerDirection } from '../enums'
import type { LedgerType } from '../types'

type Input = LedgerType.Movement
type Output = boolean

export class LedgerMovementGuard {
  guard(input: Input): Output {
    const { direction, money, balanceBefore, balanceAfter } = input

    const credit = direction === LedgerDirection.CREDIT
    const debit = direction === LedgerDirection.DEBIT
    const known = credit || debit

    if (!known) { return false }

    const added = balanceBefore.add(money)
    const removed = balanceBefore.subtract(money)
    const expected = credit ? added : removed

    return expected.equals(balanceAfter)
  }
}
