import { Injectable } from '@nestjs/common'
import type { ClockProtocol } from '@application/protocols'

@Injectable()
export class SystemClock implements ClockProtocol {
  now(): Date {
    return new Date()
  }
}
