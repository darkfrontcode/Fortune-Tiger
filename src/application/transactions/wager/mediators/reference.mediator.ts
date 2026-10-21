import type { Ledger } from '../../../../domain/ledger'
import { FailureCode } from '../../../../domain/wager/enums'
import type { WagerTransaction } from '../../../../domain/wager/wager'
import { TransactionsType } from '../types'
import { WagerMediator } from './wager.mediator'

type Mediation = TransactionsType.Mediation

export class ReferenceMediator {
  retry(wager: WagerTransaction, mediation: Mediation): Ledger | undefined {
    const reference = mediation.reference
    const terminal = reference !== undefined && reference.isTerminal()

    if (terminal) { return WagerMediator.mediate(wager, mediation) }

    wager.scheduleRetry(mediation.at)

    const exhausted = wager.exhausted()

    if (!exhausted) { return undefined }

    wager.reject(FailureCode.REFERENCE_NOT_FOUND)

    return undefined
  }
}
