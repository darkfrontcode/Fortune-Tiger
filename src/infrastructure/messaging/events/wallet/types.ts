import type { LedgerDirection } from '@domain/ledger/enums'
import type { MoneyType } from '@domain/money/types'

export namespace WalletEventType {
  export type BalanceChangedData = {
    walletId: string
    transactionId: string
    direction: LedgerDirection
    money: MoneyType.Output
    balanceBefore: MoneyType.Output
    balanceAfter: MoneyType.Output
    walletVersion: number
  }
}
