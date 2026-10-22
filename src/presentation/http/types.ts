import type { ProviderIdentity } from '../../application/protocols'
import type { LedgerDirection } from '../../domain/ledger/enums'
import type { Money } from '../../domain/money/money'
import type {
  FailureCode,
  WagerTransactionKind,
  WagerTransactionStatus,
} from '../../domain/wager/enums'

export namespace HttpType {
  export type MoneyOutput = {
    amount: string
    currency: string
  }

  export type WalletInput = {
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

  export type Request = {
    body: Record<string, unknown> | undefined
    headers: Record<string, string | undefined>
    provider: ProviderIdentity
  }

  export type Response = {
    status(code: number): Response
    json(body: unknown): void
  }
}
