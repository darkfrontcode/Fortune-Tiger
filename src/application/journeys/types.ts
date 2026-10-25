import type { JourneyOutcome, JourneyStage } from './enums'

export namespace JourneyType {
  export type Schema = {
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

  export type Input = {
    flowId: string
    stage: JourneyStage
    operation: string
    outcome: JourneyOutcome
    startedAt: Date
    providerId?: string | undefined
    playerId?: string | undefined
    wagerId?: string | undefined
    walletId?: string | undefined
    failureCode?: string | undefined
  }

  export type Query = {
    flowId: string | undefined
    playerId: string | undefined
    providerId: string
    stage: JourneyStage | undefined
    outcome: JourneyOutcome | undefined
    from: Date | undefined
    to: Date | undefined
    limit: number
  }

  export type TimelineInput = {
    flowId?: string
    playerId?: string
    providerId: string
    stage?: JourneyStage
    outcome?: JourneyOutcome
    from?: Date
    to?: Date
    limit?: number
  }

  export type Timeline = {
    items: Array<Schema>
  }
}
