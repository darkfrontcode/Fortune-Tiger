import type { Money } from '../money/money'
import { FailureCode, WagerTransactionKind, WagerTransactionStatus } from './enums'
import { WagerType } from './types'
import { WagerGuard } from './wager.guard'

type Schema = WagerType.Schema
type Input = WagerType.Input

export class WagerTransaction {
  private constructor(private readonly schema: Schema) {}

  static create(input: Input): WagerTransaction {
    WagerGuard.reference(input.kind, input.referenceExternalTransactionId)

    const schema = {
      id: input.id,
      providerId: input.providerId,
      externalTransactionId: input.externalTransactionId,
      idempotencyKey: input.idempotencyKey,
      payloadHash: input.payloadHash,
      walletId: input.walletId,
      playerId: input.playerId,
      roundId: input.roundId,
      gameId: input.gameId,
      kind: input.kind,
      money: input.money,
      referenceExternalTransactionId: input.referenceExternalTransactionId,
      createdAt: input.createdAt,
      status: WagerTransactionStatus.PENDING,
      referenceTransactionId: undefined,
      failureCode: undefined,
      processedAt: undefined,
    }

    return new WagerTransaction(schema)
  }

  static rehydrate(schema: Schema): WagerTransaction {
    return new WagerTransaction(schema)
  }

  get id(): string {
    return this.schema.id
  }

  get providerId(): string {
    return this.schema.providerId
  }

  get externalTransactionId(): string {
    return this.schema.externalTransactionId
  }

  get idempotencyKey(): string {
    return this.schema.idempotencyKey
  }

  get payloadHash(): string {
    return this.schema.payloadHash
  }

  get walletId(): string {
    return this.schema.walletId
  }

  get playerId(): string {
    return this.schema.playerId
  }

  get roundId(): string {
    return this.schema.roundId
  }

  get gameId(): string {
    return this.schema.gameId
  }

  get kind(): WagerTransactionKind {
    return this.schema.kind
  }

  get money(): Money {
    return this.schema.money
  }

  get referenceExternalTransactionId(): string | undefined {
    return this.schema.referenceExternalTransactionId
  }

  get createdAt(): Date {
    return this.schema.createdAt
  }

  get status(): WagerTransactionStatus {
    return this.schema.status
  }

  get referenceTransactionId(): string | undefined {
    return this.schema.referenceTransactionId
  }

  get failureCode(): FailureCode | undefined {
    return this.schema.failureCode
  }

  get processedAt(): Date | undefined {
    return this.schema.processedAt
  }

  markProcessed(referenceTransactionId: string | undefined, at: Date): void {
    WagerGuard.move(this.schema.status, WagerTransactionStatus.PROCESSED)

    this.schema.status = WagerTransactionStatus.PROCESSED
    this.schema.referenceTransactionId = referenceTransactionId
    this.schema.failureCode = undefined
    this.schema.processedAt = at
  }

  markPendingReference(): void {
    WagerGuard.move(this.schema.status, WagerTransactionStatus.PENDING_REFERENCE)

    this.schema.status = WagerTransactionStatus.PENDING_REFERENCE
  }

  reject(code: FailureCode): void {
    WagerGuard.move(this.schema.status, WagerTransactionStatus.REJECTED)

    this.schema.status = WagerTransactionStatus.REJECTED
    this.schema.failureCode = code
  }

  fail(code: FailureCode): void {
    WagerGuard.move(this.schema.status, WagerTransactionStatus.FAILED)

    this.schema.status = WagerTransactionStatus.FAILED
    this.schema.failureCode = code
  }

  isTerminal(): boolean {
    return WagerGuard.terminal(this.schema.status)
  }

  requiresReference(): boolean {
    return WagerGuard.referenced(this.schema.kind)
  }
}
