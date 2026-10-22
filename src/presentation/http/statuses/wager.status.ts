import { HttpStatus } from '@nestjs/common'
import type { TransactionsType } from '../../application/transactions'
import { WagerStatusMap } from '../maps'

type Output = TransactionsType.SubmitOutput

export class WagerStatus {
  private readonly statuses = new WagerStatusMap()

  of(output: Output): HttpStatus {
    const replay = output.idempotentReplay

    if (replay) { return HttpStatus.OK }

    return this.statuses.get(output.status) ?? HttpStatus.OK
  }
}