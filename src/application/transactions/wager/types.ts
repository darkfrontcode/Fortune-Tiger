import type { Money } from '../../../domain/money/money'
import type { Wallet } from '../../../domain/wallet/wallet'
import type { FailureCode, WagerTransactionKind, WagerTransactionStatus } from '../../../domain/wager/enums'
import type { WagerTransaction } from '../../../domain/wager/wager'

export namespace TransactionsType {
  export type QueueInbox = {
    messageId: string
    consumerName: string
    receivedAt: Date
  }

  export type SubmitInput = {
    id: string
    idempotencyKey: string
    providerId: string
    externalTransactionId: string
    playerId: string
    walletId: string
    roundId: string
    gameId: string
    kind: WagerTransactionKind
    money: Money
    referenceExternalTransactionId: string | undefined
    at: Date
    inbox?: QueueInbox
  }

  export type SubmitOutput = {
    transactionId: string
    status: WagerTransactionStatus
    balance: string
    idempotentReplay: boolean
    failureCode: FailureCode | undefined
  }

  export type Hold = {
    waiting: boolean
    code: FailureCode | undefined
  }

  export type Mediation = {
    wallet: Wallet
    reference: WagerTransaction | undefined
    reversed: boolean
    ledgerId: string
    at: Date
  }
}
