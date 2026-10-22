import { describe, expect, test } from 'bun:test'
import { BadRequestException } from '@nestjs/common'
import { TheoryProtocol } from '../../../application/protocols'
import { WalletBody } from '../wallet-body'

interface WalletBodyTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

const body = new WalletBody()

const player = {
  id: 'player-1',
}

const money = {
  amount: '10.00',
  currency: 'BRL',
  invalidAmount: '10.001',
  lowercaseCurrency: 'brl',
  withoutCurrency: { amount: '10.00' },
  list: ['10.00', 'BRL'],
}

const valid = {
  playerId: player.id,
  initialBalance: { amount: money.amount, currency: money.currency },
}

const rejected = (input: unknown) => {
  try {
    body.read(input)

    return false
  } catch (error) {
    return error instanceof BadRequestException
  }
}

describe('WalletBody', () => {
  describe('read', () => {
    test('valid - WHEN the body carries a player and an amount SHOULD return the parsed input', () => {
      const output = body.read(valid)

      expect(output.playerId).toBe(player.id)
      expect(output.initialBalance.toJSON()).toEqual({ amount: money.amount, currency: money.currency })
    })

    type Params = { input: unknown }

    const theories: WalletBodyTheory<Params>[] = [
      {
        title: 'missing body',
        description: 'WHEN the body is absent SHOULD refuse it',
        params: { input: undefined },
        expected: true,
      },
      {
        title: 'null body',
        description: 'WHEN the body is null SHOULD refuse it',
        params: { input: null },
        expected: true,
      },
      {
        title: 'list body',
        description: 'WHEN the body is a list SHOULD refuse it',
        params: { input: [] },
        expected: true,
      },
      {
        title: 'text body',
        description: 'WHEN the body is text SHOULD refuse it',
        params: { input: 'wallet' },
        expected: true,
      },
      {
        title: 'missing player',
        description: 'WHEN playerId is absent SHOULD refuse it',
        params: { input: { initialBalance: valid.initialBalance } },
        expected: true,
      },
      {
        title: 'empty player',
        description: 'WHEN playerId is empty SHOULD refuse it',
        params: { input: { playerId: '', initialBalance: valid.initialBalance } },
        expected: true,
      },
      {
        title: 'numeric player',
        description: 'WHEN playerId is not text SHOULD refuse it',
        params: { input: { playerId: 1, initialBalance: valid.initialBalance } },
        expected: true,
      },
      {
        title: 'missing money',
        description: 'WHEN initialBalance is absent SHOULD refuse it',
        params: { input: { playerId: player.id } },
        expected: true,
      },
      {
        title: 'list money',
        description: 'WHEN initialBalance is a list SHOULD refuse it',
        params: { input: { playerId: player.id, initialBalance: money.list } },
        expected: true,
      },
      {
        title: 'scale above two',
        description: 'WHEN the amount carries three decimals SHOULD refuse it',
        params: { input: { playerId: player.id, initialBalance: { amount: money.invalidAmount, currency: money.currency } } },
        expected: true,
      },
      {
        title: 'lowercase currency',
        description: 'WHEN the currency is not ISO-4217 uppercase SHOULD refuse it',
        params: { input: { playerId: player.id, initialBalance: { amount: money.amount, currency: money.lowercaseCurrency } } },
        expected: true,
      },
      {
        title: 'missing currency',
        description: 'WHEN the currency is absent SHOULD refuse it',
        params: { input: { playerId: player.id, initialBalance: money.withoutCurrency } },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WalletBodyTheory<Params>) => {
      expect(rejected(params.input)).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })
})
