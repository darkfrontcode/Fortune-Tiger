const message = 'A health dependency is unavailable.'
const name = 'HealthReadinessError'

export class HealthReadinessError extends Error {
  constructor() {
    super(message)
    this.name = name
  }
}
