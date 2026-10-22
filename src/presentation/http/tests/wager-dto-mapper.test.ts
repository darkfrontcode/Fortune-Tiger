import { describe, expect, test } from 'bun:test'
import { BadRequestException } from '@nestjs/common'
import { TheoryProtocol } from '../../../application/protocols'
import { WagerTransactionKind } from '../../../domain/wager/enums'
import type { WagerDto } from '../dtos'
import { WagerDtoMapper } from '../mappers'

interface WagerDtoMapperTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

const mapper = new WagerDtoMapper()

const identity = {
  provider: 'provider-a',
  external: 'transaction-123',
  player: 'player-1',
  wallet: 'wallet-1',
  round: 'round-1',
  game: 'game-1',
  reference: 'transaction-122',
}

const money = {
  amount: '10.00',
  currency: 'BRL',
  invalidAmount: '10.001',
  invalidCurrency: 'brl',
}

const valid: WagerDto = {
  providerId: identity.provider,
  externalTransactionId: identity.external,
  playerId: identity.player,
  walletId: identity.wallet,
  roundId: identity.round,
  gameId: identity.game,
  kind: WagerTransactionKind.BET,
  money: { amount: money.amount, currency: money.currency },
}

const refund = (overrides?: Partial<WagerDto>): WagerDto => ({
  ...valid,
  kind: WagerTransactionKind.REFUND,
  referenceExternalTransactionId: identity.reference,
  ...overrides,
})

const rejected = (input: WagerDto) => {
  try {
    mapper.map(input)

    return false
  } catch (error) {
    return error instanceof BadRequestException
  }
}

describe('WagerDtoMapper', () => {
  describe('map', () => {
    test('valid bet - WHEN the dto carries a kind and an amount SHOULD return the parsed input', () => {
      const output = mapper.map(valid)

      expect(output.kind).toBe(WagerTransactionKind.BET)
      expect(output.playerId).toBe(identity.player)
      expect(output.money.toJSON()).toEqual({ amount: money.amount, currency: money.currency })
      expect(output.referenceExternalTransactionId).toBeUndefined()
    })

    test('valid refund - WHEN the reversal carries a reference SHOULD keep it', () => {
      const output = mapper.map(refund())

      expect(output.kind).toBe(WagerTransactionKind.REFUND)
      expect(output.referenceExternalTransactionId).toBe(identity.reference)
    })

    test('internal opening - WHEN the kind is OPENING SHOULD accept it and leave the rule to the use case', () => {
      const output = mapper.map({ ...valid, kind: WagerTransactionKind.OPENING })

      expect(output.kind).toBe(WagerTransactionKind.OPENING)
    })

    type Params = { input: WagerDto }

    const theories: WagerDtoMapperTheory<Params>[] = [
      {
        title: 'invalid amount scale',
        description: 'WHEN the amount has three decimals SHOULD refuse it',
        params: { input: { ...valid, money: { amount: money.invalidAmount, currency: money.currency } } },
        expected: true,
      },
      {
        title: 'invalid currency case',
        description: 'WHEN the currency is lowercase SHOULD refuse it',
        params: { input: { ...valid, money: { amount: money.amount, currency: money.invalidCurrency } } },
        expected: true,
      },
      {
        title: 'refund without reference',
        description: 'WHEN a REFUND has no reference SHOULD refuse it',
        params: { input: refund({ referenceExternalTransactionId: undefined }) },
        expected: true,
      },
      {
        title: 'rollback without reference',
        description: 'WHEN a ROLLBACK has no reference SHOULD refuse it',
        params: { input: { ...refund({ referenceExternalTransactionId: undefined }), kind: WagerTransactionKind.ROLLBACK } },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WagerDtoMapperTheory<Params>) => {
      expect(rejected(params.input)).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })
})