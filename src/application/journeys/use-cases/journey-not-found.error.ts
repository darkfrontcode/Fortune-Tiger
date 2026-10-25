const message = 'No journey for this caller.'
const name = 'JourneyNotFoundError'

export class JourneyNotFoundError extends Error {
  constructor() {
    super(message)
    this.name = name
  }
}