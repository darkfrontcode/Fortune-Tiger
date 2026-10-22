import type { GuardProtocol } from '@application/protocols'
import type { Money } from '../../money/money'
import { NEGATIVE_AMOUNT_MESSAGE } from '../data'

type Input = Money
type Output = void

export class WalletSignGuard implements GuardProtocol<Input, Output> {
  guard(input: Input): Output {
    const negative = input.isNegative()
    const message = NEGATIVE_AMOUNT_MESSAGE

    if (negative) { throw new Error(message) }
  }
}
