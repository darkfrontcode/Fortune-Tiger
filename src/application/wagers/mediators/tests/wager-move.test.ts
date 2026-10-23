import { describe, expect, test } from 'bun:test'
import { LedgerDirection } from '@domain/ledger/enums'
import { Money } from '@domain/money'
import { FailureCode, WagerTransactionKind, WagerTransactionStatus } from '@domain/wager'
import { WagerTransaction } from '@domain/wager'
import { Wallet } from '@domain/wallet'
import { OpeningStrategy } from '../../strategies/opening.strategy'
import { WagerStrategy } from '../../strategies/wager.strategy'
import { WagerMove } from '../../wager.move'

const at = new Date('2026-01-01T00:00:00.000Z')
const amount = Money.from({ amount: '10.00', currency: 'BRL' })

const createWager = (kind: WagerTransactionKind, money = amount) => WagerTransaction.create({
  id: 'wager-id',
  providerId: 'provider-id',
  externalTransactionId: 'external-id',
  idempotencyKey: 'key',
  payloadHash: 'hash',
  walletId: 'wallet-id',
  playerId: 'player-id',
  roundId: 'round-id',
  gameId: 'game-id',
  kind,
  money,
  referenceExternalTransactionId: undefined,
  createdAt: at,
})

const createWallet = (value: string) => Wallet.open({
  id: 'wallet-id',
  playerId: 'player-id',
  balance: Money.from({ amount: value, currency: 'BRL' }),
  openedAt: at,
})

describe('WagerMove', () => {
  test('WHEN a credit changes the balance SHOULD return a credit ledger', () => {
    const wager = createWager(WagerTransactionKind.WIN)
    const wallet = createWallet('0.00')
    const ledger = WagerMove.credit(wager, wallet, 'ledger-id', at, undefined)

    expect(ledger?.direction).toBe(LedgerDirection.CREDIT)
    expect(wager.status).toBe(WagerTransactionStatus.PROCESSED)
  })

  test('WHEN a zero credit does not change the balance SHOULD return no ledger', () => {
    const wager = createWager(WagerTransactionKind.WIN, Money.zero('BRL'))
    const wallet = createWallet('10.00')
    const ledger = WagerMove.credit(wager, wallet, 'ledger-id', at, undefined)

    expect(ledger).toBeUndefined()
    expect(wager.status).toBe(WagerTransactionStatus.PROCESSED)
  })

  test('WHEN a debit changes the balance SHOULD return a debit ledger', () => {
    const wager = createWager(WagerTransactionKind.BET)
    const wallet = createWallet('20.00')
    const ledger = WagerMove.debit(wager, wallet, 'ledger-id', at, undefined, FailureCode.INSUFFICIENT_FUNDS)

    expect(ledger?.direction).toBe(LedgerDirection.DEBIT)
    expect(wager.status).toBe(WagerTransactionStatus.PROCESSED)
  })

  test('WHEN a debit exceeds the balance SHOULD reject without a ledger', () => {
    const wager = createWager(WagerTransactionKind.BET)
    const wallet = createWallet('0.00')
    const ledger = WagerMove.debit(wager, wallet, 'ledger-id', at, undefined, FailureCode.INSUFFICIENT_FUNDS)

    expect(ledger).toBeUndefined()
    expect(wager.status).toBe(WagerTransactionStatus.REJECTED)
    expect(wager.failureCode).toBe(FailureCode.INSUFFICIENT_FUNDS)
  })

  test('WHEN opening is selected SHOULD use the credit move', () => {
    const wager = createWager(WagerTransactionKind.OPENING)
    const wallet = createWallet('0.00')
    const strategy = new OpeningStrategy()
    const ledger = strategy.execute(wager, { wallet, reference: undefined, reversed: false, ledgerId: 'ledger-id', at })

    expect(ledger?.direction).toBe(LedgerDirection.CREDIT)
  })

  test('WHEN an unknown strategy kind is requested SHOULD refuse it', () => {
    const read = () => WagerStrategy.from('UNKNOWN_KIND' as WagerTransactionKind)

    expect(read).toThrow()
  })
})
