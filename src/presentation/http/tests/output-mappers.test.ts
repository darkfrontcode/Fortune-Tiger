import { describe, expect, test } from 'bun:test'
import { LedgerDirection } from '@domain/ledger/enums'
import { Ledger } from '@domain/ledger/ledger'
import { Money } from '@domain/money/money'
import { FailureCode, WagerTransactionKind, WagerTransactionStatus } from '@domain/wager/enums'
import { WagerTransaction } from '@domain/wager/wager'
import { Wallet } from '@domain/wallet/wallet'
import type { HttpType } from '../types'
import { LedgerOutputMapper, WalletOutputMapper, WagerInputMapper, WagerOutputMapper, WagerSubmitMapper } from '../mappers'

const at = new Date('2026-01-01T00:00:00.000Z')
const money = Money.from({ amount: '10.00', currency: 'BRL' })
const wager = WagerTransaction.create({
  id: 'wager-1',
  providerId: 'provider-1',
  externalTransactionId: 'external-1',
  idempotencyKey: 'key-1',
  payloadHash: 'hash-1',
  walletId: 'wallet-1',
  playerId: 'player-1',
  roundId: 'round-1',
  gameId: 'game-1',
  kind: WagerTransactionKind.BET,
  money,
  referenceExternalTransactionId: undefined,
  createdAt: at,
})
const wallet = Wallet.open({ id: 'wallet-1', playerId: 'player-1', balance: money, openedAt: at })
const ledger = Ledger.create({
  id: 'ledger-1',
  walletId: wallet.id,
  transactionId: wager.id,
  direction: LedgerDirection.CREDIT,
  money,
  balanceBefore: Money.zero('BRL'),
  balanceAfter: money,
  createdAt: at,
})

describe('HTTP output mappers', () => {
  test('WHEN a wallet is mapped SHOULD expose its public fields', () => {
    expect(new WalletOutputMapper().map(wallet)).toEqual({
      id: wallet.id,
      playerId: wallet.playerId,
      balance: { amount: '10.00', currency: 'BRL' },
      version: 1,
    })
  })

  test('WHEN a ledger is mapped SHOULD expose all money values', () => {
    expect(new LedgerOutputMapper().map(ledger)).toEqual({
      id: ledger.id,
      transactionId: ledger.transactionId,
      direction: LedgerDirection.CREDIT,
      amount: { amount: '10.00', currency: 'BRL' },
      balanceBefore: { amount: '0.00', currency: 'BRL' },
      balanceAfter: { amount: '10.00', currency: 'BRL' },
      createdAt: at,
    })
  })

  test('WHEN a wager is mapped SHOULD expose its transaction fields', () => {
    expect(new WagerOutputMapper().map(wager)).toMatchObject({
      transactionId: wager.id,
      providerId: wager.providerId,
      externalTransactionId: wager.externalTransactionId,
      playerId: wager.playerId,
      walletId: wager.walletId,
      kind: WagerTransactionKind.BET,
      status: WagerTransactionStatus.PENDING,
      money: { amount: '10.00', currency: 'BRL' },
      createdAt: at,
    })
  })

  test('WHEN a wager result is mapped SHOULD add the response currency', () => {
    const output = new WagerSubmitMapper().map({
      output: {
        transactionId: wager.id,
        status: WagerTransactionStatus.REJECTED,
        balance: '0.00',
        idempotentReplay: false,
        failureCode: FailureCode.INSUFFICIENT_FUNDS,
      },
      currency: 'BRL',
    })

    expect(output).toEqual({
      transactionId: wager.id,
      status: WagerTransactionStatus.REJECTED,
      balance: { amount: '0.00', currency: 'BRL' },
      idempotentReplay: false,
      failureCode: FailureCode.INSUFFICIENT_FUNDS,
    })
  })

  test('WHEN a wager request is mapped SHOULD preserve the body and request context', () => {
    const body: HttpType.WagerInput = {
      providerId: 'body-provider',
      externalTransactionId: 'external-1',
      playerId: 'player-1',
      walletId: 'wallet-1',
      roundId: 'round-1',
      gameId: 'game-1',
      kind: WagerTransactionKind.BET,
      money,
      referenceExternalTransactionId: undefined,
    }

    const output = new WagerInputMapper().map({ body, providerId: 'header-provider', idempotencyKey: 'key-1', at })

    expect(output).toMatchObject({ ...body, providerId: 'header-provider', idempotencyKey: 'key-1', at })
    expect(output.id).toMatch(/^[0-9a-f-]{36}$/)
  })
})
