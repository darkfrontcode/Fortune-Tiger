import { HttpStatus } from '@nestjs/common'
import { WagerTransactionStatus } from '@domain/wager/enums'

type Status = WagerTransactionStatus
type Code = HttpStatus

export class WagerStatusMap extends Map<Status, Code> {
  constructor() {
    super([
      [WagerTransactionStatus.PENDING, HttpStatus.ACCEPTED],
      [WagerTransactionStatus.PENDING_REFERENCE, HttpStatus.ACCEPTED],
      [WagerTransactionStatus.PROCESSED, HttpStatus.OK],
      [WagerTransactionStatus.REJECTED, HttpStatus.UNPROCESSABLE_ENTITY],
      [WagerTransactionStatus.FAILED, HttpStatus.SERVICE_UNAVAILABLE],
    ])
  }
}
