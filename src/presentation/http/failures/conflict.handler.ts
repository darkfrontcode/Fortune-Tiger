import { HttpStatus } from '@nestjs/common'
import { WalletConflictError } from '@application/wallets'
import type { HttpType } from '../types'
import { FailureHandler } from './failure-handler'

type Response = HttpType.Response

export class ConflictHandler extends FailureHandler {
  protected override answer(exception: unknown, response: Response): boolean {
    const conflict = exception instanceof WalletConflictError

    if (!conflict) { return false }

    const body = { message: exception.message }

    this.reply(response, HttpStatus.CONFLICT, body)

    return true
  }
}
