import { Catch, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common'
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import type { LoggerProtocol } from '../../application/protocols'
import { LOGGER } from '../../application/tokens'
import { WALLET_PLAYER_CURRENCY_CONFLICT_MESSAGE } from '../../infrastructure/persistence/data'
import { INFRASTRUCTURE_FAILURE_MESSAGE } from './data'
import type { HttpType } from './types'

@Injectable()
@Catch()
export class HttpFailureFilter implements ExceptionFilter {
  constructor(@Inject(LOGGER) private readonly logger: LoggerProtocol) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpType.Response>()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const body = exception.getResponse()

      this.reply(response, status, body)
      return
    }

    const message = this.message(exception)
    const conflict = message === WALLET_PLAYER_CURRENCY_CONFLICT_MESSAGE

    if (conflict) {
      const body = { message }

      this.reply(response, HttpStatus.CONFLICT, body)
      return
    }

    this.logger.warn(message)

    const body = { message: INFRASTRUCTURE_FAILURE_MESSAGE }

    this.reply(response, HttpStatus.SERVICE_UNAVAILABLE, body)
  }

  private readonly message = (exception: unknown): string => {
    const error = exception instanceof Error

    if (error) { return exception.message }

    return String(exception)
  }

  private readonly reply = (response: HttpType.Response, status: number, body: unknown): void => {
    response.status(status)
    response.json(body)
  }
}
