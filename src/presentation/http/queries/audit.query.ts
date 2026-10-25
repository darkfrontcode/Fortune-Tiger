import { BadRequestException } from '@nestjs/common'
import { INVALID_AUDIT_QUERY_MESSAGE } from '../data'
import type { HttpType } from '../types'

type Input = HttpType.Query
type Output = HttpType.AuditQuery

const empty = String()
const defaultLimit = 50
const minimumLimit = 1
const maximumLimit = 100

export class AuditQuery {
  read(input: Input): Output {
    const eventType = this.text(input.eventType)
    const from = this.date(input.from)
    const to = this.date(input.to)
    const limit = this.limit(input.limit)

    return { eventType, from, to, limit }
  }

  private readonly text = (value: string | undefined): string | undefined => {
    const absent = value === undefined || value === empty

    if (absent) { return undefined }

    return value
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

  private readonly limit = (value: string | undefined): number => {
    const absent = value === undefined || value === empty

    if (absent) { return defaultLimit }

    const limit = Number(value)
    const valid = Number.isInteger(limit) && limit >= minimumLimit && limit <= maximumLimit

    if (!valid) { return this.fail() }

    return limit
  }

  private readonly fail = (): never => {
    throw new BadRequestException(INVALID_AUDIT_QUERY_MESSAGE)
  }
}
