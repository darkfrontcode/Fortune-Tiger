import type { GuardProtocol } from '@application/protocols'
import type { LedgerType } from '../types'

type Input = LedgerType.Movement
type Output = boolean

export class LedgerCurrencyGuard implements GuardProtocol<Input, Output> {
  guard(input: Input): Output {
    const { money, balanceBefore, balanceAfter } = input

    const shared = balanceBefore.currency === money.currency
    const closing = money.currency === balanceAfter.currency

    return shared && closing
  }
}
