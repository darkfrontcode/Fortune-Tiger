import { HttpStatus } from '@nestjs/common'
import { WagerNotFoundError } from '@application/wagers/errors'
import { JourneyNotFoundError } from '@application/journeys'
import { WalletNotFoundError } from '@application/wallets'
import type { HttpType } from '../types'
import { FailureHandler } from './failure-handler'

type Response = HttpType.Response

export class NotFoundHandler extends FailureHandler {
  protected override answer(exception: unknown, response: Response): boolean {
    const wallet = exception instanceof WalletNotFoundError
    const wager = exception instanceof WagerNotFoundError
    const journey = exception instanceof JourneyNotFoundError

    if (!wallet && !wager && !journey) { return false }

    const error = exception instanceof Error

    if (!error) { return false }

    this.reply(response, HttpStatus.NOT_FOUND, exception.message)

    return true
  }
}
