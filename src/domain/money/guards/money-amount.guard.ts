
import { INVALID_MONEY_AMOUNT_MESSAGE } from '../data'
import { MoneyAmountPattern } from '../patterns'

type Input = string
type Output = void

export class MoneyAmountGuard {
  private readonly pattern = new MoneyAmountPattern()

  guard(input: Input): Output {
    const accepted = this.pattern.test(input)
    const message = INVALID_MONEY_AMOUNT_MESSAGE

    if (accepted) { return }

    throw new Error(message)
  }
}
