import type { GuardProtocol } from '@application/protocols'
import { BALANCE_EQUATION_MESSAGE, CURRENCY_CONFLICT_MESSAGE } from '../data'
import type { LedgerType } from '../types'
import { LedgerCurrencyGuard } from './ledger-currency.guard'
import { LedgerMovementGuard } from './ledger-movement.guard'

type Input = LedgerType.Movement
type Output = void

export class LedgerEquationGuard implements GuardProtocol<Input, Output> {
  private readonly currency = new LedgerCurrencyGuard()
  private readonly movement = new LedgerMovementGuard()

  guard(input: Input): Output {
    const aligned = this.currency.guard(input)

    if (!aligned) {
      const message = CURRENCY_CONFLICT_MESSAGE

      throw new Error(message)
    }

    const balanced = this.movement.guard(input)

    if (balanced) { return }

    const message = BALANCE_EQUATION_MESSAGE

    throw new Error(message)
  }
}
