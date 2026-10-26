import { HttpStatus } from '@nestjs/common'
import { WalletReconciliationNotFoundError } from '@application/reconciliations/errors'
import type { HttpType } from '../types'
import { FailureHandler } from './failure-handler'

type Response = HttpType.Response

export class ReconciliationNotFoundHandler extends FailureHandler {
  protected override answer(exception: unknown, response: Response): boolean {
    const missing = exception instanceof WalletReconciliationNotFoundError

    if (!missing) { return false }

    const body = { walletId: exception.walletId, failureCode: exception.failureCode }

    this.reply(response, HttpStatus.NOT_FOUND, body)

    return true
  }
}
