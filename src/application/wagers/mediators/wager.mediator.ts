import { Injectable } from '@nestjs/common'
import type { Ledger } from '@domain/ledger'
import { FailureCode } from '@domain/wager/enums'
import type { WagerTransaction } from '@domain/wager/wager'
import { WagersType } from '../types'
import { WagerReferencesService } from '../services'
import { WagerStrategy } from '../strategies'

type Mediation = WagersType.Mediation

@Injectable()
export class WagerMediator {
  constructor(
    private readonly references: WagerReferencesService = new WagerReferencesService(),
    private readonly strategies: WagerStrategy = new WagerStrategy(),
  ) {}

  mediate(wager: WagerTransaction, mediation: Mediation): Ledger | undefined {
    const owned = this.references.owner(wager, mediation.wallet)

    if (!owned) {
      wager.reject(FailureCode.PLAYER_WALLET_MISMATCH)

      return undefined
    }

    const aligned = this.references.currency(wager, mediation.wallet)

    if (!aligned) {
      wager.reject(FailureCode.CURRENCY_MISMATCH)

      return undefined
    }

    const hold = this.references.hold(wager, mediation.reference, mediation.reversed)

    if (hold.waiting) {
      wager.markPendingReference()

      return undefined
    }

    const code = hold.code

    if (code !== undefined) {
      wager.reject(code)

      return undefined
    }

    const strategy = this.strategies.from(wager.kind)

    return strategy.execute(wager, mediation)
  }
}
