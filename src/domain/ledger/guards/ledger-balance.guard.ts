
import type { LedgerType } from '../types'
import { LedgerCurrencyGuard } from './ledger-currency.guard'
import { LedgerMovementGuard } from './ledger-movement.guard'

type Input = LedgerType.Movement
type Output = boolean

export class LedgerBalanceGuard {
  private readonly currency = new LedgerCurrencyGuard()
  private readonly movement = new LedgerMovementGuard()

  guard(input: Input): Output {
    const aligned = this.currency.guard(input)

    if (!aligned) { return false }

    const moved = this.movement.guard(input)

    return moved
  }
}
