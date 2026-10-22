import type { GuardProtocol } from '@application/protocols'
import type { Money } from '../../money/money'
import { INSUFFICIENT_FUNDS_MESSAGE } from '../data'

type Input = Money
type Output = void

export class WalletFundsGuard implements GuardProtocol<Input, Output> {
  guard(input: Input): Output {
    const negative = input.isNegative()
    const message = INSUFFICIENT_FUNDS_MESSAGE

    if (negative) { throw new Error(message) }
  }
}
