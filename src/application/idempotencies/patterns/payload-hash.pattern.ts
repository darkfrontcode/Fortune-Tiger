import { createHash } from 'node:crypto'

import type { PatternProtocol } from '../../protocols'
import { IdempotencyType } from '../types'

type Input = IdempotencyType.Payload
type Output = string
type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]
type JsonObject = { [key: string]: JsonValue }
type KeyChild = {
  key: string
  child: JsonValue
}

export class PayloadHashPattern implements PatternProtocol<Input, Output> {
  private readonly algorithm = 'sha256'
  private readonly encoding = 'hex'

  test(input: Input): Output {
    const document = this.document(input)
    const canonical = this.canonicalize(document)
    const serialized = JSON.stringify(canonical)
    const hasher = createHash(this.algorithm)

    hasher.update(serialized)

    const encoded = hasher.digest(this.encoding)

    return encoded
  }

  private document(payload: Input): JsonObject {
    const money = {
      amount: payload.money.amount,
      currency: payload.money.currency,
    }

    const reference = payload.referenceExternalTransactionId

    const base = {
      externalTransactionId: payload.externalTransactionId,
      gameId: payload.gameId,
      kind: payload.kind,
      money,
      playerId: payload.playerId,
      providerId: payload.providerId,
      roundId: payload.roundId,
      walletId: payload.walletId,
    }

    if (reference === undefined) {
      return base
    }

    return { ...base, referenceExternalTransactionId: reference }
  }

  private canonicalize(value: JsonValue): JsonValue {
    if (value === null) {
      return value
    }

    if (Array.isArray(value)) {
      return this.canonicalizeArray(value)
    }

    const primitive = typeof value !== 'object'

    if (primitive) {
      return value
    }

    const record = value

    return this.canonicalizeObject(record)
  }

  private canonicalizeArray(values: JsonValue[]): JsonValue[] {
    const byValue = (item: JsonValue) => this.canonicalize(item)

    return values.map(byValue)
  }

  private canonicalizeObject(record: JsonObject): JsonObject {
    const keys = Object.keys(record).sort()

    const byKey = (key: string) => {
      const nested = record[key]
      const omitted = nested === undefined

      if (omitted) {
        return undefined
      }

      const child = this.canonicalize(nested)

      return { key, child }
    }

    const defined = (pair: KeyChild | undefined): pair is KeyChild => pair !== undefined

    const pairs = keys.map(byKey).filter(defined)

    const foldPair = (accumulator: JsonObject, pair: KeyChild) => {
      const next = { ...accumulator, [pair.key]: pair.child }

      return next
    }

    const empty = {}

    return pairs.reduce(foldPair, empty)
  }
}
