import type { WagerTransactionStatus } from '../../domain/wager/enums'

export namespace ReferenceType {
  export type Input = {
    at: Date
    limit: number
  }

  export type RetryOutput = {
    transactionId: string
    status: WagerTransactionStatus
  }

  export type Output = {
    checked: number
    processed: number
    rejected: number
    waiting: number
  }
}
