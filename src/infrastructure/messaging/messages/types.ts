import type { Money } from '../../../domain/money/money'
import type { WagerTransactionKind } from '../../../domain/wager/enums'

export namespace WagerRequestType {
  export type Schema = {
    messageId: string
    occurredAt: Date
    data: Data
  }

  export type Input = {
    body: string
  }

  export type Data = {
    providerId: string
    externalTransactionId: string
    playerId: string
    walletId: string
    roundId: string
    gameId: string
    idempotencyKey: string
    kind: WagerTransactionKind
    money: Money
    referenceExternalTransactionId: string | undefined
  }

  export type Envelope = {
    messageId?: unknown
    type?: unknown
    occurredAt?: unknown
    data?: unknown
    eventType?: unknown
  }

  export type Payload = {
    providerId?: unknown
    externalTransactionId?: unknown
    playerId?: unknown
    walletId?: unknown
    roundId?: unknown
    gameId?: unknown
    idempotencyKey?: unknown
    kind?: unknown
    money?: unknown
    referenceExternalTransactionId?: unknown
  }

  export type Amount = {
    amount?: unknown
    currency?: unknown
  }
}

export namespace InboxMessageType {
  export type Schema = {
    messageId: string
    consumerName: string
    payloadHash: string
    receivedAt: Date
    processedAt: Date | undefined
  }

  export type ReceiveInput = {
    messageId: string
    consumerName: string
    payloadHash: string
    receivedAt: Date
  }
}

export namespace OutboxMessageType {
  export type Schema = {
    id: string
    aggregateId: string
    eventType: string
    payload: Readonly<Record<string, unknown>>
    occurredAt: Date
    attempts: number
    nextAttemptAt: Date | undefined
    publishedAt: Date | undefined
  }
}
