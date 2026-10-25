import { Inject, Injectable } from '@nestjs/common'
import type { JourneyStoreProtocol } from '../protocols'
import { JOURNEY_STORE } from '../tokens'
import type { JourneyType } from '../types'

type Input = JourneyType.TimelineInput
type Output = Promise<JourneyType.Timeline>

const defaultLimit = 50
const maximumLimit = 100
const minimumLimit = 1

const limit = (value: number | undefined): number => {
  const absent = value === undefined

  if (absent) { return defaultLimit }

  return Math.max(minimumLimit, Math.min(value, maximumLimit))
}

@Injectable()
export class FindJourneyUseCase {
  constructor(@Inject(JOURNEY_STORE) private readonly store: JourneyStoreProtocol) {}

  async execute(input: Input): Output {
    const query = {
      flowId: input.flowId,
      playerId: input.playerId,
      providerId: input.providerId,
      stage: input.stage,
      outcome: input.outcome,
      from: input.from,
      to: input.to,
      limit: limit(input.limit),
    }
    const items = await this.store.timeline(query)

    return { items }
  }
}
