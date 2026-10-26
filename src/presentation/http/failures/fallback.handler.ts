import { HttpStatus } from '@nestjs/common'
import type { LoggerProtocol } from '@application/observability'
import type { HttpType } from '../types'
import { INFRASTRUCTURE_FAILURE_MESSAGE } from '../data'
import { FailureHandler } from './failure-handler'

type Response = HttpType.Response

export class FallbackHandler extends FailureHandler {
  constructor(private readonly logger: LoggerProtocol) {
    super()
  }

  protected override answer(exception: unknown, response: Response): boolean {
    const message = exception instanceof Error ? exception.message : String(exception)

    this.logger.warn(message)

    this.reply(response, HttpStatus.SERVICE_UNAVAILABLE, { message: INFRASTRUCTURE_FAILURE_MESSAGE })

    return true
  }
}
