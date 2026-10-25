import { BadRequestException } from '@nestjs/common'
import { JourneyOutcome, JourneyStage } from '@application/journeys'
import { INVALID_JOURNEY_QUERY_MESSAGE } from '../data'
import type { HttpType } from '../types'

type Input = HttpType.Query
type Output = HttpType.JourneyQuery

const empty = String()
const defaultLimit = 50
const minimumLimit = 1
const maximumLimit = 100

export class JourneyQuery {
  read(input: Input): Output {
    const stage = this.stage(input.stage)
    const outcome = this.outcome(input.outcome)
    const from = this.date(input.from)
    const to = this.date(input.to)
    const limit = this.limit(input.limit)

    return { stage, outcome, from, to, limit }
  }

  private readonly stage = (value: string | undefined): JourneyStage | undefined => {
    const absent = value === undefined || value === empty

    if (absent) { return undefined }

    const known = Object.values(JourneyStage).includes(value as JourneyStage)

    if (!known) { return this.fail() }

    return value as JourneyStage
  }

  private readonly outcome = (value: string | undefined): JourneyOutcome | undefined => {
    const absent = value === undefined || value === empty

    if (absent) { return undefined }

    const known = Object.values(JourneyOutcome).includes(value as JourneyOutcome)

    if (!known) { return this.fail() }

    return value as JourneyOutcome
  }

  private readonly date = (value: string | undefined): Date | undefined => {
    const text = this.text(value)
    const absent = text === undefined

    if (absent) { return undefined }

    const parsed = new Date(text)
    const invalid = Number.isNaN(parsed.getTime())

    if (invalid) { return this.fail() }

    return parsed
  }

  private readonly text = (value: string | undefined): string | undefined => {
    const absent = value === undefined || value === empty

    if (absent) { return undefined }

    return value
  }

  private readonly limit = (value: string | undefined): number => {
    const absent = value === undefined || value === empty

    if (absent) { return defaultLimit }

    const limit = Number(value)
    const valid = Number.isInteger(limit) && limit >= minimumLimit && limit <= maximumLimit

    if (!valid) { return this.fail() }

    return limit
  }

  private readonly fail = (): never => {
    throw new BadRequestException(INVALID_JOURNEY_QUERY_MESSAGE)
  }
}