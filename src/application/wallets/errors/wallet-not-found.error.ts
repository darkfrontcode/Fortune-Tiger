const message = 'Wallet not found.'
const name = 'WalletNotFoundError'

export class WalletNotFoundError extends Error {
  constructor() {
    super(message)
    this.name = name
  }
}
