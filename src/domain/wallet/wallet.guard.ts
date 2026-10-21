import type { Money } from '../money/money'
import {
  CURRENCY_CONFLICT_MESSAGE,
  INSUFFICIENT_FUNDS_MESSAGE,
  NEGATIVE_AMOUNT_MESSAGE,
} from './data'

export class WalletGuard {
  static sign(money: Money): void {
    const negative = money.isNegative()
    const message = NEGATIVE_AMOUNT_MESSAGE

    if (negative) { throw new Error(message) }
  }

  static currency(currency: string, other: string): void {
    const equals = currency === other
    const message = CURRENCY_CONFLICT_MESSAGE

    if (equals) { return }

    throw new Error(message)
  }

  static funds(balance: Money): void {
    const negative = balance.isNegative()
    const message = INSUFFICIENT_FUNDS_MESSAGE

    if (negative) { throw new Error(message) }
  }
}
