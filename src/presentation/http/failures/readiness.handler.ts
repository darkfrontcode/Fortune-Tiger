import { HttpStatus } from '@nestjs/common'
import { HealthReadinessError, HealthStatus } from '@application/health'
import type { HttpType } from '../types'
import { FailureHandler } from './failure-handler'

type Response = HttpType.Response

export class ReadinessHandler extends FailureHandler {
  protected override answer(exception: unknown, response: Response): boolean {
    const readiness = exception instanceof HealthReadinessError

    if (!readiness) { return false }

    const body = { status: HealthStatus.UNAVAILABLE }

    this.reply(response, HttpStatus.SERVICE_UNAVAILABLE, body)

    return true
  }
}
