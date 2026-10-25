import type { ProviderIdentity } from '@presentation/http/providers'
import type { LedgerDirection } from '@domain/ledger/enums'
import type { Money } from '@domain/money/money'
import type {
  FailureCode,
  WagerTransactionKind,
  WagerTransactionStatus,
} from '@domain/wager/enums'
import type { JourneyOutcome, JourneyStage } from '@application/journeys'

export namespace HttpType {
  export type MoneyOutput = {
    amount: string
    currency: string
  }

  export type WalletInput = {
    id: string
    playerId: string
    initialBalance: Money
  }

  export type WagerInput = {
    providerId: string
    externalTransactionId: string
    playerId: string
    walletId: string
    roundId: string
    gameId: string
    kind: WagerTransactionKind
    money: Money
    referenceExternalTransactionId: string | undefined
  }

  export type LedgerQuery = {
    cursor: string | undefined
    limit: number
  }

  export type WalletOutput = {
    id: string
    playerId: string
    balance: MoneyOutput
    version: number
  }

  export type LedgerOutput = {
    id: string
    transactionId: string
    direction: LedgerDirection
    amount: MoneyOutput
    balanceBefore: MoneyOutput
    balanceAfter: MoneyOutput
    createdAt: Date
  }

  export type LedgerOutputPage = {
    items: Array<LedgerOutput>
    nextCursor: string | undefined
  }

  export type AuditActorOutput = {
    type: string
    id: string
  }

  export type AuditEventOutput = {
    eventId: string
    eventType: string
    eventVersion: number
    occurredAt: Date
    recordedAt: Date
    wagerId: string | undefined
    correlationId: string
    causationId: string | undefined
    source: string
    actor: AuditActorOutput | undefined
    metadata: Record<string, string>
  }

  export type AuditTimelineOutput = {
    items: Array<AuditEventOutput>
  }

  export type AuditQuery = {
    eventType: string | undefined
    from: Date | undefined
    to: Date | undefined
    limit: number
  }

  export type WagerSubmitOutput = {
    transactionId: string
    status: WagerTransactionStatus
    balance: MoneyOutput
    idempotentReplay: boolean
    failureCode: FailureCode | undefined
  }

  export type WagerOutput = {
    transactionId: string
    providerId: string
    externalTransactionId: string
    playerId: string
    walletId: string
    roundId: string
    gameId: string
    kind: WagerTransactionKind
    status: WagerTransactionStatus
    money: MoneyOutput
    failureCode: FailureCode | undefined
    createdAt: Date
  }

  export type Query = Record<string, string | undefined>

  export type JourneyQuery = {
    stage: JourneyStage | undefined
    outcome: JourneyOutcome | undefined
    from: Date | undefined
    to: Date | undefined
    limit: number
  }

  export type JourneyStepOutput = {
    stepId: string
    flowId: string
    stage: JourneyStage
    operation: string
    outcome: JourneyOutcome
    occurredAt: Date
    durationMs: number
    providerId: string | undefined
    playerId: string | undefined
    wagerId: string | undefined
    walletId: string | undefined
    failureCode: string | undefined
  }

  export type JourneyTimelineOutput = {
    items: Array<JourneyStepOutput>
  }

  export type Request = {
    body: Record<string, unknown> | undefined
    headers: Record<string, string | undefined>
    provider: ProviderIdentity | undefined
    flowId: string | undefined
  }

  export type Response = {
    status(code: number): Response
    json(body: unknown): void
  }
}
