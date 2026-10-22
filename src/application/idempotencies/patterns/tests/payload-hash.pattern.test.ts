import { describe, expect, test } from 'bun:test'
import { TheoryProtocol } from '../../../protocols'
import { Money } from '../../../../domain/money/money'
import { WagerTransactionKind } from '../../../../domain/wager/enums'
import { IdempotencyType } from '../../types'
import { PayloadHashPattern } from '../payload-hash.pattern'

interface PayloadHashTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

type Payload = IdempotencyType.Payload

const currency = {
  brl: 'BRL',
}

const amount = {
  ten: '10.00',
  eleven: '11.00',
}

const identity = {
  provider: 'provider-a',
  external: 'transaction-123',
  wallet: 'wallet-id',
  player: 'player-id',
  round: 'round-id',
  game: 'game-id',
}

const reference = {
  external: 'reference-external',
}

const canonical = {
  digest: '3c09c66a56ebe01c9c9689e4bc5d984f84ec0492f46b9dd01069c0a0b8fba5a5',
}

const pattern = new PayloadHashPattern()

class PayloadHashProbe {
  static money(value: string): Money {
    return Money.from({ amount: value, currency: currency.brl })
  }

  static payload(referenceExternal: string | undefined, value: string): Payload {
    return {
      providerId: identity.provider,
      externalTransactionId: identity.external,
      playerId: identity.player,
      walletId: identity.wallet,
      roundId: identity.round,
      gameId: identity.game,
      kind: WagerTransactionKind.BET,
      money: PayloadHashProbe.money(value),
      referenceExternalTransactionId: referenceExternal,
    }
  }
}

describe('PayloadHashPattern', () => {
  describe('digest', () => {
    type Params = { digest: string }

    const theories: PayloadHashTheory<Params>[] = [
      {
        title: 'bet',
        description: 'WHEN the payload has no reference SHOULD yield the canonical digest',
        params: { digest: canonical.digest },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: PayloadHashTheory<Params>) => {
      const payload = PayloadHashProbe.payload(undefined, amount.ten)
      const hash = pattern.test(payload)
      const same = hash === params.digest

      expect(same).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('amount', () => {
    type Params = { value: string }

    const theories: PayloadHashTheory<Params>[] = [
      {
        title: 'other amount',
        description: 'WHEN the money amount changes SHOULD change the digest',
        params: { value: amount.eleven },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: PayloadHashTheory<Params>) => {
      const payload = PayloadHashProbe.payload(undefined, amount.ten)
      const hash = pattern.test(payload)
      const other = PayloadHashProbe.payload(undefined, params.value)
      const otherHash = pattern.test(other)
      const changed = hash !== otherHash

      expect(changed).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })

  describe('reference', () => {
    type Params = { reference: string }

    const theories: PayloadHashTheory<Params>[] = [
      {
        title: 'external reference',
        description: 'WHEN the reference is present SHOULD differ from the payload without it',
        params: { reference: reference.external },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: PayloadHashTheory<Params>) => {
      const payload = PayloadHashProbe.payload(undefined, amount.ten)
      const hash = pattern.test(payload)
      const other = PayloadHashProbe.payload(params.reference, amount.ten)
      const otherHash = pattern.test(other)
      const changed = hash !== otherHash

      expect(changed).toBe(expected)
    }

    test.each(theories)('$title - $description', prove)
  })
})
