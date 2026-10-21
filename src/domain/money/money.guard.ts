import {
  CURRENCY_CONFLICT_MESSAGE,
  INVALID_CURRENCY_MESSAGE,
  INVALID_MONEY_AMOUNT_MESSAGE,
} from './data'

import { MoneyAmountPattern, MoneyCurrencyPattern } from './patterns'

export class MoneyGuard {
  static amount(amount: string): asserts amount is string {
    const pattern = new MoneyAmountPattern()
    const accepted = pattern.test(amount)
    const message = INVALID_MONEY_AMOUNT_MESSAGE

    if (!accepted) { throw new Error(message) }
  }

  static currency(currency: string): asserts currency is string {
    const pattern = new MoneyCurrencyPattern()
    const code = pattern.test(currency)
    const message = INVALID_CURRENCY_MESSAGE

    if (!code) { throw new Error(message) }
  }

  static equal(currency: string, other: string): asserts currency is string {
    const equals = currency === other
    const message = CURRENCY_CONFLICT_MESSAGE

    if (equals) { return }

    throw new Error(message)
  }
}
