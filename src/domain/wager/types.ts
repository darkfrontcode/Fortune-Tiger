import type { Money } from '../money/money'
import { FailureCode, WagerTransactionKind, WagerTransactionStatus } from './enums'

export namespace WagerType {
  export type Schema = {
    id: string
    providerId: string
    externalTransactionId: string
    idempotencyKey: string
    payloadHash: string
    walletId: string
    playerId: string
    roundId: string
    gameId: string
    kind: WagerTransactionKind
    money: Money
    referenceExternalTransactionId: string | undefined
    createdAt: Date
    status: WagerTransactionStatus
    referenceTransactionId: string | undefined
    failureCode: FailureCode | undefined
    processedAt: Date | undefined
  }

  export type Input = {
    id: string
    providerId: string
    externalTransactionId: string
    idempotencyKey: string
    payloadHash: string
    walletId: string
    playerId: string
    roundId: string
    gameId: string
    kind: WagerTransactionKind
    money: Money
    referenceExternalTransactionId: string | undefined
    createdAt: Date
  }
}
