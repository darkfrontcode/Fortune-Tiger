import type { Money } from '../money/money'

export namespace WalletType {
  export type Schema = {
    id: string
    playerId: string
    balance: Money
    version: number
    createdAt: Date
    updatedAt: Date
  }

  export type Input = {
    id: string
    playerId: string
    balance: Money
    openedAt: Date
  }
}
