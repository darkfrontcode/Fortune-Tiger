import type { Money } from '@domain/money/money'
import type { MoneyType } from '@domain/money/types'
import type { Ledger } from '@domain/ledger/ledger'

type MoneyOutput = MoneyType.Output

export namespace ReconciliationsType {
  export type Snapshot = {
    stored: Money
    ledgers: Ledger[]
  }

  export type CompareOutput = {
    walletId: string
    storedBalance: MoneyOutput
    calculatedBalance: MoneyOutput
    difference: MoneyOutput
    consistent: boolean
    checkedEntries: number
  }

  export type LedgerBalanceInput = {
    currency: string
    ledgers: Ledger[]
  }
}
