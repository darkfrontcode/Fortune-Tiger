import type { Money } from '../../domain/money/money'
import type { FailureCode, WagerTransactionKind, WagerTransactionStatus } from '../../domain/wager/enums'
import type { WagerTransaction } from '../../domain/wager/wager'

import { IdempotencyOutcome } from './enums'

export namespace IdempotencyType {
  export type Payload = {
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

  export type Stored = {
    wager: WagerTransaction
    observedBalance: string
  }

  export type Hash = {
    stored: string
    incoming: string
  }

  export type Input = {
    key: string
    hash: string
    stored: Stored | undefined
  }

  export type Fresh = {
    outcome: IdempotencyOutcome.FRESH
  }

  export type Replay = {
    outcome: IdempotencyOutcome.REPLAY
    idempotentReplay: true
    transactionId: string
    status: WagerTransactionStatus
    balance: string
    failureCode: FailureCode | undefined
  }

  export type Conflict = {
    outcome: IdempotencyOutcome.CONFLICT
    failureCode: FailureCode.IDEMPOTENCY_PAYLOAD_CONFLICT
  }

  export type Output = Fresh | Replay | Conflict
}
