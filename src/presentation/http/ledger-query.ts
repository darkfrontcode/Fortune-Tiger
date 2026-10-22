import { BadRequestException } from '@nestjs/common'
import { INVALID_LEDGER_QUERY_MESSAGE } from './data'
import type { HttpType } from './types'

type Input = HttpType.Query
type Output = HttpType.LedgerQuery

const empty = String()
const encoding = 'base64url'
const defaultLimit = 50
const minimumLimit = 1
const maximumLimit = 100
const cursorFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export class LedgerQuery {
  read(input: Input): Output {
    const cursor = this.cursor(input.cursor)
    const limit = this.limit(input.limit)

    return { cursor, limit }
  }

  private readonly cursor = (value: string | undefined): string | undefined => {
    const absent = value === undefined || value === empty

    if (absent) { return undefined }

    const id = Buffer.from(value, encoding).toString()
    const valid = cursorFormat.test(id)

    if (!valid) { return this.fail() }

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
    throw new BadRequestException(INVALID_LEDGER_QUERY_MESSAGE)
  }
}
