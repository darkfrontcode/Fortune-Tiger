import type { GuardProtocol } from '../../../application/protocols'
import { CURRENCY_CONFLICT_MESSAGE } from '../data'
import type { MoneyType } from '../types'

type Input = MoneyType.Conflict
type Output = void

export class MoneyConflictGuard implements GuardProtocol<Input, Output> {
  guard(input: Input): Output {
    const { currency, compared } = input

    const same = currency === compared
    const message = CURRENCY_CONFLICT_MESSAGE

    if (same) { return }

    throw new Error(message)
  }
}
