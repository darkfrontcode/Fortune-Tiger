import { describe, expect, test } from 'bun:test'
import { BadRequestException } from '@nestjs/common'
import { TheoryProtocol } from '../../../application/protocols'
import { WagerTransactionKind } from '../../../domain/wager/enums'
import { WagerBody } from '../bodies'

interface WagerBodyTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

const body = new WagerBody()

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
}

const bet = {
  providerId: identity.provider,
  externalTransactionId: identity.external,
  playerId: identity.player,
  walletId: identity.wallet,
  roundId: identity.round,
  gameId: identity.game,
  kind: WagerTransactionKind.BET,
  money: { amount: money.amount, currency: money.currency },
}

const refund = {
  ...bet,
  kind: WagerTransactionKind.REFUND,
  referenceExternalTransactionId: identity.reference,
}

const rejected = (input: unknown) => {
  try {
    body.read(input)

    return false
  } catch (error) {
    return error instanceof BadRequestException
  }
}

describe('WagerBody', () => {
  describe('read', () => {
    test('valid bet - WHEN the body carries a kind and an amount SHOULD return the parsed input', () => {
      const output = body.read(bet)

      expect(output.kind).toBe(WagerTransactionKind.BET)
      expect(output.playerId).toBe(identity.player)
      expect(output.money.toJSON()).toEqual({ amount: money.amount, currency: money.currency })
      expect(output.referenceExternalTransactionId).toBeUndefined()
    })

    test('valid refund - WHEN the reversal carries a reference SHOULD keep it', () => {
      const output = body.read(refund)

      expect(output.kind).toBe(WagerTransactionKind.REFUND)
      expect(output.referenceExternalTransactionId).toBe(identity.reference)
    })

    test('internal opening - WHEN the kind is OPENING SHOULD accept it and leave the rule to the use case', () => {
      const output = body.read({ ...bet, kind: WagerTransactionKind.OPENING })

      expect(output.kind).toBe(WagerTransactionKind.OPENING)
    })

    type Params = { input: unknown }

    const theories: WagerBodyTheory<Params>[] = [
      {
        title: 'missing body',
        description: 'WHEN the body is absent SHOULD refuse it',
        params: { input: undefined },
        expected: true,
      },
      {
        title: 'text body',
        description: 'WHEN the body is text SHOULD refuse it',
        params: { input: 'wager' },
        expected: true,
      },
      {
        title: 'missing kind',
        description: 'WHEN the kind is absent SHOULD refuse it',
        params: { input: { ...bet, kind: undefined } },
        expected: true,
      },
      {
        title: 'unknown kind',
        description: 'WHEN the kind is unknown SHOULD refuse it',
        params: { input: { ...bet, kind: 'BONUS' } },
        expected: true,
      },
      {
        title: 'missing wallet',
        description: 'WHEN the wallet is absent SHOULD refuse it',
        params: { input: { ...bet, walletId: undefined } },
        expected: true,
      },
      {
        title: 'missing round',
        description: 'WHEN the round is absent SHOULD refuse it',
        params: { input: { ...bet, roundId: '' } },
        expected: true,
      },
      {
        title: 'invalid amount',
        description: 'WHEN the amount carries three decimals SHOULD refuse it',
        params: { input: { ...bet, money: { amount: money.invalidAmount, currency: money.currency } } },
        expected: true,
      },
      {
        title: 'refund without reference',
        description: 'WHEN a REFUND carries no reference SHOULD refuse it',
        params: { input: { ...refund, referenceExternalTransactionId: undefined } },
        expected: true,
      },
      {
        title: 'rollback without reference',
        description: 'WHEN a ROLLBACK carries no reference SHOULD refuse it',
        params: { input: { ...refund, kind: WagerTransactionKind.ROLLBACK, referenceExternalTransactionId: undefined } },
        expected: true,
      },
      {
        title: 'empty reference',
        description: 'WHEN the reference is empty SHOULD refuse it',
        params: { input: { ...refund, referenceExternalTransactionId: '' } },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: WagerBodyTheory<Params>) => {
      expect(rejected(params.input)).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })
})
