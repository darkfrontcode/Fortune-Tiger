import type { Wallet } from '../../../domain/wallet'
import {
  FailureCode,
  WagerTransactionKind,
  WagerTransactionStatus,
} from '../../../domain/wager/enums'
import { ReferenceMap } from '../../../domain/wager/maps'
import type { WagerTransaction } from '../../../domain/wager/wager'
import { TransactionsType } from './types'

type Hold = TransactionsType.Hold

const kinds = new ReferenceMap()

export class WagerReference {
  static owner(wager: WagerTransaction, wallet: Wallet): boolean {
    const sameWallet = wager.walletId === wallet.id
    const samePlayer = wager.playerId === wallet.playerId

    return sameWallet && samePlayer
  }

  static currency(wager: WagerTransaction, wallet: Wallet): boolean {
    return wager.money.currency === wallet.currency
  }

  static hold(wager: WagerTransaction, reference: WagerTransaction | undefined, reversed: boolean): Hold {
    const required = wager.requiresReference()
    const win = wager.kind === WagerTransactionKind.WIN
    const present = reference !== undefined
    const optional = win && present
    const checked = required || optional

    if (!checked) { return WagerReference.ready() }

    if (reference === undefined) { return WagerReference.defer() }

    const pending = WagerReference.pending(reference)

    if (pending) { return WagerReference.defer() }

    const dead = WagerReference.dead(reference)

    if (dead) { return WagerReference.refuse(FailureCode.REFERENCE_NOT_FOUND) }

    const scoped = WagerReference.scope(wager, reference)

    if (!scoped) { return WagerReference.refuse(FailureCode.REFERENCE_SCOPE_MISMATCH) }

    const allowed = WagerReference.kind(wager, reference)

    if (!allowed) { return WagerReference.refuse(FailureCode.INVALID_REFERENCE_KIND) }

    if (!required) { return WagerReference.ready() }

    const equal = wager.money.equals(reference.money)

    if (!equal) { return WagerReference.refuse(FailureCode.REFERENCE_AMOUNT_MISMATCH) }

    if (reversed) { return WagerReference.refuse(FailureCode.REFERENCE_ALREADY_REVERSED) }

    return WagerReference.ready()
  }

  private static pending(reference: WagerTransaction): boolean {
    const status = reference.status
    const started = status === WagerTransactionStatus.PENDING
    const waiting = status === WagerTransactionStatus.PENDING_REFERENCE

    return started || waiting
  }

  private static dead(reference: WagerTransaction): boolean {
    const status = reference.status
    const rejected = status === WagerTransactionStatus.REJECTED
    const failed = status === WagerTransactionStatus.FAILED

    return rejected || failed
  }

  private static scope(wager: WagerTransaction, reference: WagerTransaction): boolean {
    const provider = wager.providerId === reference.providerId
    const player = wager.playerId === reference.playerId
    const wallet = wager.walletId === reference.walletId
    const round = wager.roundId === reference.roundId
    const currency = wager.money.currency === reference.money.currency
    const external = wager.referenceExternalTransactionId === reference.externalTransactionId

    return provider && player && wallet && round && currency && external
  }

  private static kind(wager: WagerTransaction, reference: WagerTransaction): boolean {
    const allowed = kinds.get(wager.kind)

    return allowed.includes(reference.kind)
  }

  private static ready(): Hold {
    const waiting = false
    const code = undefined

    return { waiting, code }
  }

  private static defer(): Hold {
    const waiting = true
    const code = undefined

    return { waiting, code }
  }

  private static refuse(code: FailureCode): Hold {
    const waiting = false

    return { waiting, code }
  }
}
