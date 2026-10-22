import type { ClockProtocol } from '@application/time'

export namespace ObservabilityType {
  export type Schema = {
    clock: ClockProtocol
    pretty: boolean
    context: Context
  }

  export type Input = {
    clock: ClockProtocol
    pretty: boolean
  }

  export type Context = {
    correlationId?: string
    messageId?: string
    transactionId?: string
    walletId?: string
    providerId?: string
  }

  export type Output = Context & {
    time: string
    level: string
    message: string
  }
}
