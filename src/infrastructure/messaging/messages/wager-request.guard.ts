import { Money } from '../../../domain/money/money'
import { WagerTransactionKind } from '../../../domain/wager/enums'
import { INVALID_WAGER_REQUEST_MESSAGE } from './data'
import type { WagerRequestType } from './types'

type Envelope = WagerRequestType.Envelope
type Payload = WagerRequestType.Payload
type Amount = WagerRequestType.Amount
type Data = WagerRequestType.Data

const requestType = 'WagerTransactionRequested'
const kinds = Object.values(WagerTransactionKind)

const fail = (): never => {
  throw new Error(INVALID_WAGER_REQUEST_MESSAGE)
}

export class WagerRequestGuard {
  static object<Value>(value: unknown): Value {
    const valid = typeof value === 'object' && value !== null && !Array.isArray(value)

    if (!valid) { return fail() }

    return value as Value
  }

  static text(value: unknown): string {
    const valid = typeof value === 'string' && value.length > 0

    if (!valid) { return fail() }

    return value
  }

  static integration(value: Envelope): boolean {
    return typeof value.eventType === 'string'
  }

  static type(value: unknown): void {
    const text = WagerRequestGuard.text(value)
    const valid = text === requestType

    if (!valid) { fail() }
  }

  static date(value: unknown): Date {
    const text = WagerRequestGuard.text(value)
    const parsed = new Date(text)
    const invalid = Number.isNaN(parsed.getTime())

    if (invalid) { return fail() }

    return parsed
  }

  static kind(value: unknown): WagerTransactionKind {
    const text = WagerRequestGuard.text(value)
    const found = kinds.includes(text as WagerTransactionKind)

    if (!found) { return fail() }

    return text as WagerTransactionKind
  }

  static money(value: unknown): Money {
    const source = WagerRequestGuard.object<Amount>(value)
    const amount = WagerRequestGuard.text(source.amount)
    const currency = WagerRequestGuard.text(source.currency)

    try {
      return Money.from({ amount, currency })
    } catch {
      return fail()
    }
  }

  static reference(value: unknown): string | undefined {
    const absent = value === undefined

    if (absent) { return undefined }

    return WagerRequestGuard.text(value)
  }

  static referenced(kind: WagerTransactionKind, reference: string | undefined): void {
    const reversal = kind === WagerTransactionKind.REFUND || kind === WagerTransactionKind.ROLLBACK
    const missing = reversal && reference === undefined

    if (missing) { fail() }
  }

  static data(value: unknown): Data {
    const source = WagerRequestGuard.object<Payload>(value)
    const kind = WagerRequestGuard.kind(source.kind)
    const reference = WagerRequestGuard.reference(source.referenceExternalTransactionId)

    WagerRequestGuard.referenced(kind, reference)

    return {
      providerId: WagerRequestGuard.text(source.providerId),
      externalTransactionId: WagerRequestGuard.text(source.externalTransactionId),
      playerId: WagerRequestGuard.text(source.playerId),
      walletId: WagerRequestGuard.text(source.walletId),
      roundId: WagerRequestGuard.text(source.roundId),
      gameId: WagerRequestGuard.text(source.gameId),
      idempotencyKey: WagerRequestGuard.text(source.idempotencyKey),
      kind,
      money: WagerRequestGuard.money(source.money),
      referenceExternalTransactionId: reference,
    }
  }
}
