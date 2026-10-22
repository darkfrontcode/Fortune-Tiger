import { Injectable } from '@nestjs/common'
import type { Ledger } from '@domain/ledger'
import { FailureCode } from '@domain/wager/enums'
import type { WagerTransaction } from '@domain/wager/wager'
import { TransactionsType } from '../types'
import { WagerReference } from '../wager.reference'
import { WagerStrategy } from '../strategies'

type Mediation = TransactionsType.Mediation

@Injectable()
export class WagerMediator {
  mediate(wager: WagerTransaction, mediation: Mediation): Ledger | undefined {
    const owned = WagerReference.owner(wager, mediation.wallet)

    if (!owned) {
      wager.reject(FailureCode.PLAYER_WALLET_MISMATCH)

      return undefined
    }

    const aligned = WagerReference.currency(wager, mediation.wallet)

    if (!aligned) {
      wager.reject(FailureCode.CURRENCY_MISMATCH)

      return undefined
    }

    const hold = WagerReference.hold(wager, mediation.reference, mediation.reversed)

    if (hold.waiting) {
      wager.markPendingReference()

      return undefined
    }

    const code = hold.code

    if (code !== undefined) {
      wager.reject(code)

      return undefined
    }

    const strategy = WagerStrategy.from(wager.kind)

    return strategy.execute(wager, mediation)
  }
}
