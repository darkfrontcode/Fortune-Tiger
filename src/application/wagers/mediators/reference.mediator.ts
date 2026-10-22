import { Injectable } from '@nestjs/common'
import type { Ledger } from '@domain/ledger'
import { FailureCode } from '@domain/wager/enums'
import type { WagerTransaction } from '@domain/wager/wager'
import { WagersType } from '../types'
import { WagerMediator } from './wager.mediator'

type Mediation = WagersType.Mediation

@Injectable()
export class ReferenceMediator {
  constructor(private readonly mediator: WagerMediator) {}

  retry(wager: WagerTransaction, mediation: Mediation): Ledger | undefined {
    const reference = mediation.reference
    const terminal = reference !== undefined && reference.isTerminal()

    if (terminal) { return this.mediator.mediate(wager, mediation) }

    wager.scheduleRetry(mediation.at)

    const exhausted = wager.exhausted()

    if (!exhausted) { return undefined }

    wager.reject(FailureCode.REFERENCE_NOT_FOUND)

    return undefined
  }
}
