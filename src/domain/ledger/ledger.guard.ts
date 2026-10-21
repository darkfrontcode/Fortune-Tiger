import type { Money } from '../money/money'
import { BALANCE_EQUATION_MESSAGE, CURRENCY_CONFLICT_MESSAGE } from './data'
import { LedgerDirection } from './types'

export class LedgerGuard {
  static currency(before: Money, money: Money, after: Money): void {
    const aligned = LedgerGuard.aligned(before, money, after)
    const message = CURRENCY_CONFLICT_MESSAGE

    if (aligned) { return }

    throw new Error(message)
  }

  static equation(direction: LedgerDirection, before: Money, money: Money, after: Money): void {
    LedgerGuard.currency(before, money, after)

    const balanced = LedgerGuard.movement(direction, before, money, after)
    const message = BALANCE_EQUATION_MESSAGE

    if (balanced) { return }

    throw new Error(message)
  }

  static balanced(direction: LedgerDirection, before: Money, money: Money, after: Money): boolean {
    const aligned = LedgerGuard.aligned(before, money, after)

    if (!aligned) { return false }

    return LedgerGuard.movement(direction, before, money, after)
  }

  private static aligned(before: Money, money: Money, after: Money): boolean {
    const shared = before.currency === money.currency
    const closing = money.currency === after.currency

    return shared && closing
  }

  private static movement(
    direction: LedgerDirection,
    before: Money,
    money: Money,
    after: Money,
  ): boolean {
    const credit = direction === LedgerDirection.CREDIT
    const debit = direction === LedgerDirection.DEBIT
    const known = credit || debit

    if (!known) { return false }

    const added = before.add(money)
    const removed = before.subtract(money)
    const expected = credit ? added : removed

    return expected.equals(after)
  }
}
