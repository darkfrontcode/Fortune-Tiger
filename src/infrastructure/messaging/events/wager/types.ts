import type { MoneyType } from '@domain/money/types'
import type {
  FailureCode,
  WagerTransactionKind,
  WagerTransactionStatus,
} from '@domain/wager/enums'

export namespace WagerEventType {
  export type ProcessedData = {
    transactionId: string
    providerId: string
    externalTransactionId: string
    playerId: string
    walletId: string
    roundId: string
    gameId: string
    kind: WagerTransactionKind
    status: WagerTransactionStatus
    money: MoneyType.Output
  }

  export type RejectedData = {
    transactionId: string
    providerId: string
    externalTransactionId: string
    playerId: string
    walletId: string
    kind: WagerTransactionKind
    status: WagerTransactionStatus
    failureCode: FailureCode | undefined
  }

  export type PendingReferenceData = {
    transactionId: string
    providerId: string
    externalTransactionId: string
    playerId: string
    walletId: string
    kind: WagerTransactionKind
    status: WagerTransactionStatus
  }
}
