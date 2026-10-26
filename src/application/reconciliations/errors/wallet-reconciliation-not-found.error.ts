import { FailureCode } from '@domain/wager/enums'

const message = 'Wallet not found.'
const name = 'WalletReconciliationNotFoundError'

export class WalletReconciliationNotFoundError extends Error {
  readonly failureCode = FailureCode.WALLET_NOT_FOUND

  constructor(readonly walletId: string) {
    super(message)
    this.name = name
  }
}
