import { describe, expect, test } from 'bun:test'
import { BadRequestException } from '@nestjs/common'
import { TheoryProtocol } from '@application/protocols'
import type { WalletDto } from '../dtos'
import { WalletDtoMapper } from '../mappers'

interface WalletDtoMapperTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

const mapper = new WalletDtoMapper()

const money = {
  amount: '10.00',
  currency: 'BRL',
  invalidAmount: '10.001',
  invalidCurrency: 'brl',
}

const valid: WalletDto = {
  playerId: 'player-1',
  initialBalance: { amount: money.amount, currency: money.currency },
}

const rejected = (input: WalletDto): boolean => {
  try {
    mapper.map(input)

    return false
  } catch (error) {
    return error instanceof BadRequestException
  }
}

describe('WalletDtoMapper', () => {
  describe('map', () => {
    test('valid - WHEN the dto carries a player and an amount SHOULD return the parsed input', () => {
      const output = mapper.map(valid)

      expect(output.playerId).toBe(valid.playerId)
      expect(output.initialBalance.toJSON()).toEqual({ amount: money.amount, currency: money.currency })
    })

    type Params = { input: WalletDto }

    const theories: WalletDtoMapperTheory<Params>[] = [
      {
        title: 'invalid amount scale',
        description: 'WHEN the amount has three decimals SHOULD refuse it',
        params: { input: { ...valid, initialBalance: { amount: money.invalidAmount, currency: money.currency } } },
        expected: true,
      },
      {
        title: 'invalid currency case',
        description: 'WHEN the currency is lowercase SHOULD refuse it',
        params: { input: { ...valid, initialBalance: { amount: money.amount, currency: money.invalidCurrency } } },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WalletDtoMapperTheory<Params>) => {
      expect(rejected(params.input)).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })
})