import { HttpStatus } from '@nestjs/common'
import type { WagersType } from '@application/wagers'
import { FailureCode } from '@domain/wager/enums'
import { WagerStatusMap } from '../maps'

type Output = WagersType.SubmitOutput

export class WagerStatus {
  private readonly statuses = new WagerStatusMap()

  of(output: Output): HttpStatus {
    const replay = output.idempotentReplay

    if (replay) { return HttpStatus.OK }

    const conflict = output.failureCode === FailureCode.IDEMPOTENCY_PAYLOAD_CONFLICT

    if (conflict) { return HttpStatus.CONFLICT }

    return this.statuses.get(output.status) ?? HttpStatus.OK
  }
}
