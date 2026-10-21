import { describe, expect, test } from 'bun:test'
import { LedgerDirection } from '../../../../../domain/ledger/enums'
import { TheoryProtocol } from '../../../../protocols'
import { Money } from '../../../../../domain/money/money'
import { Wallet } from '../../../../../domain/wallet/wallet'
import {
  FailureCode,
  WagerTransactionKind,
  WagerTransactionStatus,
} from '../../../../../domain/wager/enums'
import { WagerType } from '../../../../../domain/wager/types'
import { WagerTransaction } from '../../../../../domain/wager/wager'
import { TransactionsType } from '../../types'
import { WagerMediator } from '../wager.mediator'

interface MediatorTheory<TParams> extends TheoryProtocol<TParams> {
  title: string
  description: string
}

type Schema = WagerType.Schema
type Input = WagerType.Input
type Mediation = TransactionsType.Mediation

const currency = {
  brl: 'BRL',
  usd: 'USD',
}

const amount = {
  five: '5.00',
  ten: '10.00',
  hundred: '100.00',
}

const identity = {
  wager: 'wager-id',
  referenceWager: 'reference-wager-id',
  provider: 'provider-id',
  external: 'external-id',
  referenceExternal: 'reference-external-id',
  key: 'idempotency-key',
  hash: 'payload-hash',
  wallet: 'wallet-id',
  player: 'player-id',
  round: 'round-id',
  game: 'game-id',
  ledger: 'ledger-id',
}

const instant = {
  created: new Date('2026-01-01T00:00:00.000Z'),
  move: new Date('2026-01-01T00:00:01.000Z'),
  processed: new Date('2026-01-01T00:00:02.000Z'),
}

class MediatorProbe {
  static money(value: string, code: string): Money {
    return Money.from({ amount: value, currency: code })
  }

  static wallet(value: string, code: string, player: string): Wallet {
    const balance = MediatorProbe.money(value, code)
    const input = {
      id: identity.wallet,
      playerId: player,
      balance,
      openedAt: instant.created,
    }

    return Wallet.open(input)
  }

  static open(
    kind: WagerTransactionKind,
    referenceExternal: string | undefined,
    money: Money,
  ): WagerTransaction {
    const input: Input = {
      id: identity.wager,
      providerId: identity.provider,
      externalTransactionId: identity.external,
      idempotencyKey: identity.key,
      payloadHash: identity.hash,
      walletId: identity.wallet,
      playerId: identity.player,
      roundId: identity.round,
      gameId: identity.game,
      kind,
      money,
      referenceExternalTransactionId: referenceExternal,
      createdAt: instant.created,
    }

    return WagerTransaction.create(input)
  }

  static stored(
    id: string,
    external: string,
    kind: WagerTransactionKind,
    status: WagerTransactionStatus,
    referenceExternal: string | undefined,
    money: Money,
    player: string,
    round: string,
  ): WagerTransaction {
    const processed = status === WagerTransactionStatus.PROCESSED
    const processedAt = processed ? instant.processed : undefined
    const schema: Schema = {
      id,
      providerId: identity.provider,
      externalTransactionId: external,
      idempotencyKey: identity.key,
      payloadHash: identity.hash,
      walletId: identity.wallet,
      playerId: player,
      roundId: round,
      gameId: identity.game,
      kind,
      money,
      referenceExternalTransactionId: referenceExternal,
      createdAt: instant.created,
      status,
      referenceTransactionId: undefined,
      failureCode: undefined,
      processedAt,
    }

    return WagerTransaction.rehydrate(schema)
  }

  static mediation(
    wallet: Wallet,
    reference: WagerTransaction | undefined,
    reversed: boolean,
  ): Mediation {
    return {
      wallet,
      reference,
      reversed,
      ledgerId: identity.ledger,
      at: instant.move,
    }
  }
}

describe('WagerMediator', () => {
  describe('guards', () => {
    type Params = {
      player: string
      currency: string
      code: FailureCode
    }

    const money = MediatorProbe.money(amount.ten, currency.brl)
    const theories: MediatorTheory<Params>[] = [
      {
        title: 'other player',
        description: 'WHEN the wallet player differs SHOULD reject with player wallet mismatch',
        params: {
          player: 'other-player',
          currency: currency.brl,
          code: FailureCode.PLAYER_WALLET_MISMATCH,
        },
        expected: true,
      },
      {
        title: 'other currency',
        description: 'WHEN the wallet currency differs SHOULD reject with currency mismatch',
        params: {
          player: identity.player,
          currency: currency.usd,
          code: FailureCode.CURRENCY_MISMATCH,
        },
        expected: true,
      },
    ]

    const prove = ({ params, expected }: MediatorTheory<Params>) => {
      const wallet = MediatorProbe.wallet(amount.hundred, params.currency, params.player)
      const wager = MediatorProbe.open(WagerTransactionKind.BET, undefined, money)
      const mediation = MediatorProbe.mediation(wallet, undefined, false)
      const ledger = WagerMediator.mediate(wager, mediation)
      const rejected = wager.status === WagerTransactionStatus.REJECTED
      const sameCode = wager.failureCode === params.code
      const empty = ledger === undefined
      const ok = rejected && sameCode && empty

      expect(ok).toBe(expected)
    }

    theories.forEach((theory) => {
      test(theory.description, () => {
        prove(theory)
      })
    })
  })

  describe('reference hold', () => {
    const money = MediatorProbe.money(amount.ten, currency.brl)
    const wallet = MediatorProbe.wallet(amount.hundred, currency.brl, identity.player)

    test('pending reference - WHEN the reference is still pending SHOULD mark pending reference', () => {
      const wager = MediatorProbe.open(
        WagerTransactionKind.REFUND,
        identity.referenceExternal,
        money,
      )
      const reference = MediatorProbe.stored(
        identity.referenceWager,
        identity.referenceExternal,
        WagerTransactionKind.BET,
        WagerTransactionStatus.PENDING,
        undefined,
        money,
        identity.player,
        identity.round,
      )
      const mediation = MediatorProbe.mediation(wallet, reference, false)
      const ledger = WagerMediator.mediate(wager, mediation)
      const waiting = wager.status === WagerTransactionStatus.PENDING_REFERENCE
      const empty = ledger === undefined

      expect(waiting && empty).toBe(true)
    })

    test('dead reference - WHEN the reference was rejected SHOULD refuse reference not found', () => {
      const wager = MediatorProbe.open(
        WagerTransactionKind.REFUND,
        identity.referenceExternal,
        money,
      )
      const reference = MediatorProbe.stored(
        identity.referenceWager,
        identity.referenceExternal,
        WagerTransactionKind.BET,
        WagerTransactionStatus.REJECTED,
        undefined,
        money,
        identity.player,
        identity.round,
      )
      const mediation = MediatorProbe.mediation(wallet, reference, false)
      const ledger = WagerMediator.mediate(wager, mediation)
      const rejected = wager.status === WagerTransactionStatus.REJECTED
      const code = wager.failureCode === FailureCode.REFERENCE_NOT_FOUND
      const empty = ledger === undefined

      expect(rejected && code && empty).toBe(true)
    })

    test('scope - WHEN the round differs SHOULD refuse reference scope mismatch', () => {
      const wager = MediatorProbe.open(
        WagerTransactionKind.REFUND,
        identity.referenceExternal,
        money,
      )
      const reference = MediatorProbe.stored(
        identity.referenceWager,
        identity.referenceExternal,
        WagerTransactionKind.BET,
        WagerTransactionStatus.PROCESSED,
        undefined,
        money,
        identity.player,
        'other-round',
      )
      const mediation = MediatorProbe.mediation(wallet, reference, false)
      const ledger = WagerMediator.mediate(wager, mediation)
      const rejected = wager.status === WagerTransactionStatus.REJECTED
      const code = wager.failureCode === FailureCode.REFERENCE_SCOPE_MISMATCH
      const empty = ledger === undefined

      expect(rejected && code && empty).toBe(true)
    })

    test('kind - WHEN the reference kind is invalid SHOULD refuse invalid reference kind', () => {
      const wager = MediatorProbe.open(
        WagerTransactionKind.REFUND,
        identity.referenceExternal,
        money,
      )
      const reference = MediatorProbe.stored(
        identity.referenceWager,
        identity.referenceExternal,
        WagerTransactionKind.LOSS,
        WagerTransactionStatus.PROCESSED,
        undefined,
        money,
        identity.player,
        identity.round,
      )
      const mediation = MediatorProbe.mediation(wallet, reference, false)
      const ledger = WagerMediator.mediate(wager, mediation)
      const rejected = wager.status === WagerTransactionStatus.REJECTED
      const code = wager.failureCode === FailureCode.INVALID_REFERENCE_KIND
      const empty = ledger === undefined

      expect(rejected && code && empty).toBe(true)
    })

    test('amount - WHEN the refund amount differs SHOULD refuse reference amount mismatch', () => {
      const larger = MediatorProbe.money(amount.hundred, currency.brl)
      const wager = MediatorProbe.open(
        WagerTransactionKind.REFUND,
        identity.referenceExternal,
        larger,
      )
      const reference = MediatorProbe.stored(
        identity.referenceWager,
        identity.referenceExternal,
        WagerTransactionKind.BET,
        WagerTransactionStatus.PROCESSED,
        undefined,
        money,
        identity.player,
        identity.round,
      )
      const mediation = MediatorProbe.mediation(wallet, reference, false)
      const ledger = WagerMediator.mediate(wager, mediation)
      const rejected = wager.status === WagerTransactionStatus.REJECTED
      const code = wager.failureCode === FailureCode.REFERENCE_AMOUNT_MISMATCH
      const empty = ledger === undefined

      expect(rejected && code && empty).toBe(true)
    })

    test('reversed - WHEN the reference was already reversed SHOULD refuse already reversed', () => {
      const wager = MediatorProbe.open(
        WagerTransactionKind.REFUND,
        identity.referenceExternal,
        money,
      )
      const reference = MediatorProbe.stored(
        identity.referenceWager,
        identity.referenceExternal,
        WagerTransactionKind.BET,
        WagerTransactionStatus.PROCESSED,
        undefined,
        money,
        identity.player,
        identity.round,
      )
      const mediation = MediatorProbe.mediation(wallet, reference, true)
      const ledger = WagerMediator.mediate(wager, mediation)
      const rejected = wager.status === WagerTransactionStatus.REJECTED
      const code = wager.failureCode === FailureCode.REFERENCE_ALREADY_REVERSED
      const empty = ledger === undefined

      expect(rejected && code && empty).toBe(true)
    })
  })

  describe('strategies', () => {
    const money = MediatorProbe.money(amount.ten, currency.brl)
    const wallet = MediatorProbe.wallet(amount.hundred, currency.brl, identity.player)

    test('bet - WHEN funds are enough SHOULD debit and return a ledger', () => {
      const wager = MediatorProbe.open(WagerTransactionKind.BET, undefined, money)
      const mediation = MediatorProbe.mediation(wallet, undefined, false)
      const ledger = WagerMediator.mediate(wager, mediation)
      const processed = wager.status === WagerTransactionStatus.PROCESSED
      const posted = ledger !== undefined
      const debit = ledger?.direction === LedgerDirection.DEBIT

      expect(processed && posted && debit).toBe(true)
    })

    test('bet - WHEN funds are short SHOULD reject insufficient funds', () => {
      const poor = MediatorProbe.wallet(amount.five, currency.brl, identity.player)
      const wager = MediatorProbe.open(WagerTransactionKind.BET, undefined, money)
      const mediation = MediatorProbe.mediation(poor, undefined, false)
      const ledger = WagerMediator.mediate(wager, mediation)
      const rejected = wager.status === WagerTransactionStatus.REJECTED
      const code = wager.failureCode === FailureCode.INSUFFICIENT_FUNDS
      const empty = ledger === undefined

      expect(rejected && code && empty).toBe(true)
    })

    test('loss - WHEN loss is mediated SHOULD process without a ledger', () => {
      const wager = MediatorProbe.open(WagerTransactionKind.LOSS, undefined, money)
      const mediation = MediatorProbe.mediation(wallet, undefined, false)
      const ledger = WagerMediator.mediate(wager, mediation)
      const processed = wager.status === WagerTransactionStatus.PROCESSED
      const empty = ledger === undefined

      expect(processed && empty).toBe(true)
    })

    test('win - WHEN no reference is passed SHOULD still credit', () => {
      const wager = MediatorProbe.open(WagerTransactionKind.WIN, undefined, money)
      const mediation = MediatorProbe.mediation(wallet, undefined, false)
      const ledger = WagerMediator.mediate(wager, mediation)
      const processed = wager.status === WagerTransactionStatus.PROCESSED
      const credit = ledger?.direction === LedgerDirection.CREDIT

      expect(processed && credit).toBe(true)
    })

    test('refund - WHEN the reference is valid SHOULD credit and link', () => {
      const wager = MediatorProbe.open(
        WagerTransactionKind.REFUND,
        identity.referenceExternal,
        money,
      )
      const reference = MediatorProbe.stored(
        identity.referenceWager,
        identity.referenceExternal,
        WagerTransactionKind.BET,
        WagerTransactionStatus.PROCESSED,
        undefined,
        money,
        identity.player,
        identity.round,
      )
      const mediation = MediatorProbe.mediation(wallet, reference, false)
      const ledger = WagerMediator.mediate(wager, mediation)
      const processed = wager.status === WagerTransactionStatus.PROCESSED
      const credit = ledger?.direction === LedgerDirection.CREDIT
      const linked = wager.referenceTransactionId === identity.referenceWager

      expect(processed && credit && linked).toBe(true)
    })

    test('rollback - WHEN the reference was a bet SHOULD credit back', () => {
      const wager = MediatorProbe.open(
        WagerTransactionKind.ROLLBACK,
        identity.referenceExternal,
        money,
      )
      const reference = MediatorProbe.stored(
        identity.referenceWager,
        identity.referenceExternal,
        WagerTransactionKind.BET,
        WagerTransactionStatus.PROCESSED,
        undefined,
        money,
        identity.player,
        identity.round,
      )
      const mediation = MediatorProbe.mediation(wallet, reference, false)
      const ledger = WagerMediator.mediate(wager, mediation)
      const processed = wager.status === WagerTransactionStatus.PROCESSED
      const credit = ledger?.direction === LedgerDirection.CREDIT

      expect(processed && credit).toBe(true)
    })
  })
})
