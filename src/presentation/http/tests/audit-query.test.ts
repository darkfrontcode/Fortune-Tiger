import { describe, expect, test } from 'bun:test'
import { BadRequestException } from '@nestjs/common'
import { AuditQuery } from '../queries'

const query = new AuditQuery()

const accepted = (input: Parameters<AuditQuery['read']>[0]) => {
  try {
    return query.read(input)
  } catch {
    return undefined
  }
}

const rejected = (input: Parameters<AuditQuery['read']>[0]) => {
  try {
    query.read(input)

    return false
  } catch (error) {
    return error instanceof BadRequestException
  }
}

describe('AuditQuery', () => {
  test('WHEN the query carries nothing SHOULD fall back to the default limit', () => {
    const output = query.read({})

    expect(output).toEqual({ eventType: undefined, from: undefined, to: undefined, limit: 50 })
  })

  test('WHEN the query carries an event type SHOULD keep it', () => {
    const output = query.read({ eventType: 'WagerTransactionRejected' })

    expect(output.eventType).toBe('WagerTransactionRejected')
  })

  test('WHEN the query carries a range SHOULD parse both bounds', () => {
    const output = query.read({ from: '2026-07-29T14:00:00.000Z', to: '2026-07-29T16:00:00.000Z' })

    expect(output.from).toEqual(new Date('2026-07-29T14:00:00.000Z'))
    expect(output.to).toEqual(new Date('2026-07-29T16:00:00.000Z'))
  })

  test('WHEN a filter is an empty string SHOULD treat it as absent', () => {
    const output = query.read({ eventType: '', from: '', to: '', limit: '' })

    expect(output).toEqual({ eventType: undefined, from: undefined, to: undefined, limit: 50 })
  })

  test.each(['1', '100'])('WHEN the limit is %s SHOULD accept it', (value) => {
    expect(accepted({ limit: value })?.limit).toBe(Number(value))
  })

  test.each(['0', '-1', '101', '1.5', 'fifty'])('WHEN the limit is %s SHOULD refuse it', (value) => {
    expect(rejected({ limit: value })).toBe(true)
  })

  test.each(['not-a-date', '2026-13-01'])('WHEN a bound is %s SHOULD refuse it', (value) => {
    expect(rejected({ from: value })).toBe(true)
    expect(rejected({ to: value })).toBe(true)
  })
})
