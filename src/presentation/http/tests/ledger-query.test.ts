import { describe, expect, test } from 'bun:test'
import { BadRequestException } from '@nestjs/common'
import { TheoryProtocol } from '@application/protocols'
import { LedgerQuery } from '../queries'

interface LedgerQueryTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

const query = new LedgerQuery()

const cursor = {
  id: '0190f0f0-0000-7000-8000-000000000000',
  encoded: Buffer.from('0190f0f0-0000-7000-8000-000000000000').toString('base64url'),
  plain: 'not-a-uuid',
  malformed: Buffer.from('not-a-uuid').toString('base64url'),
}

const limit = {
  minimum: '1',
  maximum: '100',
  zero: '0',
  above: '101',
  fraction: '1.5',
  text: 'fifty',
  negative: '-1',
  defaulted: 50,
}

const rejected = (input: Parameters<LedgerQuery['read']>[0]) => {
  try {
    query.read(input)

    return false
  } catch (error) {
    return error instanceof BadRequestException
  }
}

describe('LedgerQuery', () => {
  describe('read', () => {
    test('empty - WHEN the query carries nothing SHOULD fall back to the default limit and no cursor', () => {
      const output = query.read({})

      expect(output.cursor).toBeUndefined()
      expect(output.limit).toBe(limit.defaulted)
    })

    test('cursor - WHEN the cursor is the base64url of an id SHOULD keep it', () => {
      const output = query.read({ cursor: cursor.encoded })

      expect(output.cursor).toBe(cursor.encoded)
    })

    type Params = { input: Parameters<LedgerQuery['read']>[0]; limit?: number }

    const theories: LedgerQueryTheory<Params>[] = [
      {
        title: 'minimum limit',
        description: 'WHEN the limit is 1 SHOULD accept it',
        params: { input: { limit: limit.minimum }, limit: 1 },
        expected: true,
      },
      {
        title: 'maximum limit',
        description: 'WHEN the limit is 100 SHOULD accept it',
        params: { input: { limit: limit.maximum }, limit: 100 },
        expected: true,
      },
      {
        title: 'zero limit',
        description: 'WHEN the limit is 0 SHOULD refuse it',
        params: { input: { limit: limit.zero } },
        expected: true,
      },
      {
        title: 'negative limit',
        description: 'WHEN the limit is negative SHOULD refuse it',
        params: { input: { limit: limit.negative } },
        expected: true,
      },
      {
        title: 'limit above the cap',
        description: 'WHEN the limit is 101 SHOULD refuse it',
        params: { input: { limit: limit.above } },
        expected: true,
      },
      {
        title: 'fractional limit',
        description: 'WHEN the limit is fractional SHOULD refuse it',
        params: { input: { limit: limit.fraction } },
        expected: true,
      },
      {
        title: 'text limit',
        description: 'WHEN the limit is not a number SHOULD refuse it',
        params: { input: { limit: limit.text } },
        expected: true,
      },
      {
        title: 'plain cursor',
        description: 'WHEN the cursor is not base64url SHOULD refuse it',
        params: { input: { cursor: cursor.plain } },
        expected: true,
      },
      {
        title: 'malformed cursor',
        description: 'WHEN the cursor does not decode to an id SHOULD refuse it',
        params: { input: { cursor: cursor.malformed } },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: LedgerQueryTheory<Params>) => {
      const accepted = !rejected(params.input)
      const aligned = accepted
        ? query.read(params.input).limit === params.limit
        : expected

      expect(aligned).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })
})
