
import { INVALID_CURRENCY_MESSAGE } from '../data'
import { MoneyCurrencyPattern } from '../patterns'

type Input = string
type Output = void

export class MoneyCurrencyGuard {
  private readonly pattern = new MoneyCurrencyPattern()

  guard(input: Input): Output {
    const accepted = this.pattern.test(input)
    const message = INVALID_CURRENCY_MESSAGE

    if (accepted) { return }

    throw new Error(message)
  }
}
