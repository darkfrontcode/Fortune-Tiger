import { Injectable } from '@nestjs/common'
import type { Wallet } from '@domain/wallet'
import {
  FailureCode,
  WagerTransactionKind,
  WagerTransactionStatus,
} from '@domain/wager/enums'
import { ReferenceMap } from '@domain/wager/maps'
import type { WagerTransaction } from '@domain/wager/wager'
import { WagersType } from '../types'

type Hold = WagersType.Hold

const kinds = new ReferenceMap()

@Injectable()
export class WagerReferencesService {
  owner(wager: WagerTransaction, wallet: Wallet): boolean {
    const sameWallet = wager.walletId === wallet.id
    const samePlayer = wager.playerId === wallet.playerId

    return sameWallet && samePlayer
  }

  currency(wager: WagerTransaction, wallet: Wallet): boolean {
    return wager.money.currency === wallet.currency
  }

  hold(wager: WagerTransaction, reference: WagerTransaction | undefined, reversed: boolean): Hold {
    const required = wager.requiresReference()
    const win = wager.kind === WagerTransactionKind.WIN
    const present = reference !== undefined
    const optional = win && present
    const checked = required || optional

    if (!checked) { return this.ready() }

    if (reference === undefined) { return this.defer() }

    const pending = this.pending(reference)

    if (pending) { return this.defer() }

    const dead = this.dead(reference)

    if (dead) { return this.refuse(FailureCode.REFERENCE_NOT_FOUND) }

    const scoped = this.scope(wager, reference)

    if (!scoped) { return this.refuse(FailureCode.REFERENCE_SCOPE_MISMATCH) }

    const allowed = this.kind(wager, reference)

    if (!allowed) { return this.refuse(FailureCode.INVALID_REFERENCE_KIND) }

    if (reversed) { return this.refuse(FailureCode.REFERENCE_ALREADY_REVERSED) }

    if (!required) { return this.ready() }

    const equal = wager.money.equals(reference.money)

    if (!equal) { return this.refuse(FailureCode.REFERENCE_AMOUNT_MISMATCH) }

    return this.ready()
  }

  private pending(reference: WagerTransaction): boolean {
    const status = reference.status
    const started = status === WagerTransactionStatus.PENDING
    const waiting = status === WagerTransactionStatus.PENDING_REFERENCE

    return started || waiting
  }

  private dead(reference: WagerTransaction): boolean {
    const status = reference.status
    const rejected = status === WagerTransactionStatus.REJECTED
    const failed = status === WagerTransactionStatus.FAILED

    return rejected || failed
  }

  private scope(wager: WagerTransaction, reference: WagerTransaction): boolean {
    const provider = wager.providerId === reference.providerId
    const player = wager.playerId === reference.playerId
    const wallet = wager.walletId === reference.walletId
    const round = wager.roundId === reference.roundId
    const currency = wager.money.currency === reference.money.currency
    const external = wager.referenceExternalTransactionId === reference.externalTransactionId

    return provider && player && wallet && round && currency && external
  }

  private kind(wager: WagerTransaction, reference: WagerTransaction): boolean {
    const allowed = kinds.get(wager.kind)

    return allowed.includes(reference.kind)
  }

  private ready(): Hold {
    const waiting = false
    const code = undefined

    return { waiting, code }
  }

  private defer(): Hold {
    const waiting = true
    const code = undefined

    return { waiting, code }
  }

  private refuse(code: FailureCode): Hold {
    const waiting = false

    return { waiting, code }
  }
}
