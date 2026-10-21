import type { ClockProtocol } from '../../application/protocols'

export class SystemClock implements ClockProtocol {
  now(): Date {
    return new Date()
  }
}
