const message = 'Wager transaction not found.'
const name = 'WagerNotFoundError'

export class WagerNotFoundError extends Error {
  constructor() {
    super(message)
    this.name = name
  }
}
