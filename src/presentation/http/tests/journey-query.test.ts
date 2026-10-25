import { describe, expect, test } from 'bun:test'
import { BadRequestException } from '@nestjs/common'
import { JourneyOutcome, JourneyStage } from '@application/journeys'
import { JourneyQuery } from '../queries'

const query = new JourneyQuery()

const accepted = (input: Parameters<JourneyQuery['read']>[0]) => {
  try {
    return query.read(input)
  } catch {
    return undefined
  }
}

const rejected = (input: Parameters<JourneyQuery['read']>[0]) => {
  try {
    query.read(input)

    return false
  } catch (error) {
    return error instanceof BadRequestException
  }
}

describe('JourneyQuery', () => {
  test('WHEN the query carries nothing SHOULD fall back to the default limit', () => {
    const output = query.read({})

    expect(output).toEqual({
      stage: undefined,
      outcome: undefined,
      from: undefined,
      to: undefined,
      limit: 50,
    })
  })

  test('WHEN the query carries a stage and outcome SHOULD keep them', () => {
    const output = query.read({ stage: 'QUEUE', outcome: 'FAILED' })

    expect(output.stage).toBe(JourneyStage.QUEUE)
    expect(output.outcome).toBe(JourneyOutcome.FAILED)
  })

  test('WHEN the query carries a range SHOULD parse both bounds', () => {
    const output = query.read({ from: '2026-07-29T14:00:00.000Z', to: '2026-07-29T16:00:00.000Z' })

    expect(output.from).toEqual(new Date('2026-07-29T14:00:00.000Z'))
    expect(output.to).toEqual(new Date('2026-07-29T16:00:00.000Z'))
  })

  test('WHEN a filter is an empty string SHOULD treat it as absent', () => {
    const output = query.read({ stage: '', outcome: '', from: '', to: '', limit: '' })

    expect(output).toEqual({
      stage: undefined,
      outcome: undefined,
      from: undefined,
      to: undefined,
      limit: 50,
    })
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

  test.each(['done', 'USECASE'])('WHEN the stage is %s SHOULD refuse it', (value) => {
    const output = rejected({ stage: value })

    expect(output).toBe(true)
    expect(accepted({ stage: JourneyStage.ROUTE })?.stage).toBe(JourneyStage.ROUTE)
    expect(accepted({ stage: JourneyStage.USE_CASE })?.stage).toBe(JourneyStage.USE_CASE)
    expect(accepted({ stage: JourneyStage.DATABASE })?.stage).toBe(JourneyStage.DATABASE)
    expect(accepted({ stage: JourneyStage.QUEUE })?.stage).toBe(JourneyStage.QUEUE)
  })

  test.each(['OK', 'USECASE'])('WHEN the outcome is %s SHOULD refuse it', (value) => {
    const output = rejected({ outcome: value })

    expect(output).toBe(true)
    expect(accepted({ outcome: JourneyOutcome.SUCCEEDED })?.outcome).toBe(JourneyOutcome.SUCCEEDED)
    expect(accepted({ outcome: JourneyOutcome.FAILED })?.outcome).toBe(JourneyOutcome.FAILED)
    expect(accepted({ outcome: JourneyOutcome.ROLLBACK })?.outcome).toBe(JourneyOutcome.ROLLBACK)
  })
})