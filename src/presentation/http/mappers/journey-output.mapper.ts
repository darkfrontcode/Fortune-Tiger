import type { JourneyType } from '@application/journeys'
import type { HttpType } from '../types'
import type { MapperProtocol } from './mapper.protocol'

type Input = JourneyType.Schema
type Output = HttpType.JourneyStepOutput

export class JourneyOutputMapper implements MapperProtocol<Input, Output> {
  map(step: Input): Output {
    return {
      stepId: step.stepId,
      flowId: step.flowId,
      stage: step.stage,
      operation: step.operation,
      outcome: step.outcome,
      occurredAt: step.occurredAt,
      durationMs: step.durationMs,
      providerId: step.providerId,
      playerId: step.playerId,
      wagerId: step.wagerId,
      walletId: step.walletId,
      failureCode: step.failureCode,
    }
  }
}