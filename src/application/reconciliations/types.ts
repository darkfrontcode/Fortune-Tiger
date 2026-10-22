import type { Money } from '@domain/money/money'
import type { MoneyType } from '@domain/money/types'
import type { Ledger } from '@domain/ledger/ledger'
import type { FailureCode } from '@domain/wager/enums'

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

  export type MissingOutput = {
    walletId: string
    failureCode: FailureCode.WALLET_NOT_FOUND
  }

  export type Output = CompareOutput | MissingOutput

  export type LedgerBalanceInput = {
    currency: string
    ledgers: Ledger[]
  }
}
