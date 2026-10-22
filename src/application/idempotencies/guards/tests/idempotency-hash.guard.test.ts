import { describe, expect, test } from 'bun:test'
import type { Theory } from '@infrastructure/protocols'
import { IdempotencyHashGuard } from '../idempotency-hash.guard'

interface IdempotencyHashTheory<TParams> extends Theory<TParams> {
  title: string
  description: string
}

const blank = String()

const hash = {
  stored: 'a3f1c9',
  other: 'b7d2e4',
}

describe('IdempotencyHashGuard', () => {
  const guard = new IdempotencyHashGuard()

  type Params = { stored: string; incoming: string }

  const theories: IdempotencyHashTheory<Params>[] = [
    {
      title: 'same payload',
      description: 'WHEN the incoming hash equals the stored hash SHOULD be the same',
      params: { stored: hash.stored, incoming: hash.stored },
      expected: true,
    },
    {
      title: 'other payload',
      description: 'WHEN the incoming hash differs SHOULD not be the same',
      params: { stored: hash.stored, incoming: hash.other },
      expected: false,
    },
    {
      title: 'empty hashes',
      description: 'WHEN both hashes are blank SHOULD be the same',
      params: { stored: blank, incoming: blank },
      expected: true,
    },
  ]

  const prove = ({ params, expected }: IdempotencyHashTheory<Params>) => {
    const input = params
    const same = guard.guard(input)

    expect(same).toBe(expected)
  }

  test.each(theories)('$title - $description', prove)
})
