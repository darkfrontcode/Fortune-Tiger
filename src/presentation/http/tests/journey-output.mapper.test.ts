import { describe, expect, test } from 'bun:test'
import { JourneyOutcome, JourneyStage } from '@application/journeys'
import type { JourneyType } from '@application/journeys'
import { JourneyOutputMapper } from '../mappers'

const step: JourneyType.Schema = {
  stepId: 'step-1',
  flowId: 'provider-a:ext-1',
  stage: JourneyStage.USE_CASE,
  operation: 'SubmitWagerUseCase',
  outcome: JourneyOutcome.SUCCEEDED,
  occurredAt: new Date('2026-01-01T00:00:00.000Z'),
  durationMs: 12,
  providerId: 'provider-a',
  playerId: 'player-1',
  wagerId: 'wager-1',
  walletId: 'wallet-1',
  failureCode: undefined,
}

describe('JourneyOutputMapper', () => {
  test('WHEN a step is mapped SHOULD expose every field the client needs', () => {
    const output = new JourneyOutputMapper().map(step)

    expect(output).toEqual({
      stepId: 'step-1',
      flowId: 'provider-a:ext-1',
      stage: JourneyStage.USE_CASE,
      operation: 'SubmitWagerUseCase',
      outcome: JourneyOutcome.SUCCEEDED,
      occurredAt: step.occurredAt,
      durationMs: 12,
      providerId: 'provider-a',
      playerId: 'player-1',
      wagerId: 'wager-1',
      walletId: 'wallet-1',
      failureCode: undefined,
    })
  })
})