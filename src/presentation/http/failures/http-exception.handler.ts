import { HttpException } from '@nestjs/common'
import type { HttpType } from '../types'
import { FailureHandler } from './failure-handler'

type Response = HttpType.Response

export class HttpExceptionHandler extends FailureHandler {
  protected override answer(exception: unknown, response: Response): boolean {
    const known = exception instanceof HttpException

    if (!known) { return false }

    const status = exception.getStatus()
    const body = exception.getResponse()

    this.reply(response, status, body)

    return true
  }
}
