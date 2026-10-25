import { Inject, Injectable } from '@nestjs/common'
import type { AuditStoreProtocol } from '../protocols'
import { AUDIT_STORE } from '../tokens'
import type { AuditType } from '../types'

type Input = AuditType.TimelineInput
type Output = Promise<AuditType.Timeline>

const defaultLimit = 50
const maximumLimit = 100
const minimumLimit = 1

const limit = (value: number | undefined): number => {
  const absent = value === undefined

  if (absent) { return defaultLimit }

  return Math.max(minimumLimit, Math.min(value, maximumLimit))
}

@Injectable()
export class FindWagerAuditUseCase {
  constructor(@Inject(AUDIT_STORE) private readonly store: AuditStoreProtocol) {}

  async execute(input: Input): Output {
    const limitValue = limit(input.limit)
    const query = {
      wagerId: input.wagerId,
      eventType: input.eventType,
      from: input.from,
      to: input.to,
      limit: limitValue,
    }
    const items = await this.store.timeline(query)

    return { items }
  }
}
