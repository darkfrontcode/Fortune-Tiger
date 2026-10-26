const message = 'A wallet already exists for this player and currency.'
const name = 'WalletConflictError'

export class WalletConflictError extends Error {
  constructor() {
    super(message)
    this.name = name
  }
}
