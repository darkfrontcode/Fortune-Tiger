import { Money } from '../../../domain/money/money'
import { LedgerDirection } from '../../../domain/ledger/enums'
import type { Ledger } from '../../../domain/ledger/ledger'
import type { PatternProtocol } from '../../protocols'
import { ReconciliationsType } from '../types'

type Input = ReconciliationsType.LedgerBalanceInput

export class LedgerBalancePattern implements PatternProtocol<Input, Money> {
  test(input: Input): Money {
    const zero = Money.zero(input.currency)
    const foldLedger = (balance: Money, ledger: Ledger) => LedgerBalancePattern.fold(balance, ledger)

    return input.ledgers.reduce(foldLedger, zero)
  }

  private static fold(balance: Money, ledger: Ledger): Money {
    const credit = ledger.direction === LedgerDirection.CREDIT

    if (credit) { return balance.add(ledger.money) }

    return balance.subtract(ledger.money)
  }
}
