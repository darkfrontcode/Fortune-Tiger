import { describe, expect, test } from 'bun:test'
import { LedgerDirection } from '@domain/ledger/enums'
import { Money } from '@domain/money'
import { WagerTransactionKind } from '@domain/wager'
import { WagerTransaction } from '@domain/wager'
import { Wallet } from '@domain/wallet'
import { WagerMovesService } from '../../services'
import { OpeningOption } from '../options'
import { WagerStrategy } from '../wager.strategy'

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

describe('WagerStrategy', () => {
  test('WHEN opening is selected SHOULD use the credit move', () => {
    const wager = createWager(WagerTransactionKind.OPENING)
    const wallet = createWallet('0.00')
    const strategy = new OpeningOption(new WagerMovesService())
    const ledger = strategy.execute(wager, { wallet, reference: undefined, reversed: false, ledgerId: 'ledger-id', at })

    expect(ledger?.direction).toBe(LedgerDirection.CREDIT)
  })

  test('WHEN an unknown strategy kind is requested SHOULD refuse it', () => {
    const strategy = new WagerStrategy()
    const read = () => strategy.from('UNKNOWN_KIND' as WagerTransactionKind)

    expect(read).toThrow()
  })
})
