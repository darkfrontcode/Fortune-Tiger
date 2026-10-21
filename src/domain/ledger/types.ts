import type { Money } from '../money/money'
import { LedgerDirection } from './enums'

export namespace LedgerType {
  export type Schema = {
    id: string
    walletId: string
    transactionId: string
    direction: LedgerDirection
    money: Money
    balanceBefore: Money
    balanceAfter: Money
    createdAt: Date
  }

  export type Input = Schema
}
