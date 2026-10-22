import type { Money } from '../../domain/money/money'
import type { Wallet } from '../../domain/wallet/wallet'

export type WalletOpeningInput = {
  playerId: string
  initialBalance: Money
  openedAt: Date
}

export interface WalletOpeningProtocol {
  open(input: WalletOpeningInput): Promise<Wallet>
}
