
import { CURRENCY_CONFLICT_MESSAGE } from '../data'
import type { WalletType } from '../types'

type Input = WalletType.Conflict
type Output = void

export class WalletCurrencyGuard {
  guard(input: Input): Output {
    const { currency, compared } = input

    const same = currency === compared
    const message = CURRENCY_CONFLICT_MESSAGE

    if (same) { return }

    throw new Error(message)
  }
}
