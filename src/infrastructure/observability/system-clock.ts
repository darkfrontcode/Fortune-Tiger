import { Injectable } from '@nestjs/common'
import type { ClockProtocol } from '@application/time'

@Injectable()
export class SystemClock implements ClockProtocol {
  now(): Date {
    return new Date()
  }
}
