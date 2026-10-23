import { describe, expect, test } from 'bun:test'
import { LedgerDirection } from '@domain/ledger/enums'
import { Ledger } from '@domain/ledger/ledger'
import { Money } from '@domain/money/money'
import { Wallet } from '@domain/wallet/wallet'
import {
  FailureCode,
  WagerTransactionKind,
  WagerTransactionStatus,
} from '@domain/wager/enums'
import type { WagerTransaction } from '@domain/wager/wager'
import type { OutboxMessage } from '../../messages'
import { WagerEventsMapper } from '../wager-events.mapper'

const ids = {
  wager: 'wager-id',
  wallet: 'wallet-id',
  player: 'player-id',
  round: 'round-id',
  ledger: 'ledger-id',
}

const currency = {
  brl: 'BRL',
}

const amount = {
  hundred: '100.00',
  twenty: '20.00',
  eighty: '80.00',
}

const provider = {
  jungle: 'jungle-provider',
}

const scope = {
  game: 'fortune-tiger',
  external: 'external-transaction',
}

const instant = {
  created: new Date('2026-01-01T00:00:00.000Z'),
  processed: new Date('2026-01-01T00:00:01.000Z'),
}

const revision = {
  changed: 2,
}

const events = {
  processed: 'WagerTransactionProcessed',
  rejected: 'WagerTransactionRejected',
  changed: 'WalletBalanceChanged',
  pendingReference: 'WagerTransactionPendingReference',
}

const context = {
  correlationId: 'correlation-id',
  causationId: undefined,
  occurredAt: instant.processed,
}

const money = Money.from({ amount: amount.twenty, currency: currency.brl })

const balance = {
  before: Money.from({ amount: amount.hundred, currency: currency.brl }),
  after: Money.from({ amount: amount.eighty, currency: currency.brl }),
}

const wallet = Wallet.open({
  id: ids.wallet,
  playerId: ids.player,
  balance: balance.before,
  openedAt: instant.created,
})

wallet.debit(money, instant.processed)

const ledger = Ledger.create({
  id: ids.ledger,
  walletId: ids.wallet,
  transactionId: ids.wager,
  direction: LedgerDirection.DEBIT,
  money,
  balanceBefore: balance.before,
  balanceAfter: balance.after,
  createdAt: instant.processed,
})

const wager = {
  id: ids.wager,
  providerId: provider.jungle,
  externalTransactionId: scope.external,
  playerId: ids.player,
  walletId: ids.wallet,
  roundId: ids.round,
  gameId: scope.game,
  kind: WagerTransactionKind.BET,
  money,
}

const processed = {
  ...wager,
  status: WagerTransactionStatus.PROCESSED,
  failureCode: undefined,
} as unknown as WagerTransaction

const rejected = {
  ...wager,
  status: WagerTransactionStatus.REJECTED,
  failureCode: FailureCode.INSUFFICIENT_FUNDS,
} as unknown as WagerTransaction

const pendingReference = {
  ...wager,
  status: WagerTransactionStatus.PENDING_REFERENCE,
  failureCode: undefined,
} as unknown as WagerTransaction

const pending = {
  ...wager,
  status: WagerTransactionStatus.PENDING,
  failureCode: undefined,
} as unknown as WagerTransaction

const byEventType = (message: OutboxMessage) => message.eventType

describe('WagerEventsMapper', () => {
  const mapper = new WagerEventsMapper()

  test('WHEN the wager is processed with a ledger row SHOULD return the processed and the balance event', () => {
    const input = { wager: processed, wallet, ledger, context }
    const messages = mapper.map(input)
    const types = messages.map(byEventType)
    const expected = [events.processed, events.changed]
    const byChanged = (message: OutboxMessage) => message.eventType === events.changed
    const changed = messages.find(byChanged)
    const data = {
      walletId: ids.wallet,
      transactionId: ids.wager,
      direction: LedgerDirection.DEBIT,
      money: money.toJSON(),
      balanceBefore: balance.before.toJSON(),
      balanceAfter: balance.after.toJSON(),
      walletVersion: revision.changed,
    }

    expect(types).toEqual(expected)
    expect(changed?.payload.data).toEqual(data)
  })

  test('WHEN the wager is processed without a ledger row SHOULD return only the processed event', () => {
    const input = { wager: processed, wallet, ledger: undefined, context }
    const messages = mapper.map(input)
    const types = messages.map(byEventType)
    const expected = [events.processed]

    expect(types).toEqual(expected)
  })

  test('WHEN the wager is rejected SHOULD return the rejected event with the failure code', () => {
    const input = { wager: rejected, wallet, ledger: undefined, context }
    const messages = mapper.map(input)
    const types = messages.map(byEventType)
    const expected = [events.rejected]
    const message = messages[0]
    const data = {
      transactionId: ids.wager,
      providerId: provider.jungle,
      externalTransactionId: scope.external,
      playerId: ids.player,
      walletId: ids.wallet,
      kind: WagerTransactionKind.BET,
      status: WagerTransactionStatus.REJECTED,
      failureCode: FailureCode.INSUFFICIENT_FUNDS,
    }

    expect(types).toEqual(expected)
    expect(message?.payload.data).toEqual(data)
  })

  test('WHEN the wager waits for the reference SHOULD return the pending reference event', () => {
    const input = { wager: pendingReference, wallet, ledger: undefined, context }
    const messages = mapper.map(input)
    const types = messages.map(byEventType)
    const expected = [events.pendingReference]

    expect(types).toEqual(expected)
  })

  test('WHEN the wager is still pending SHOULD return nothing', () => {
    const input = { wager: pending, wallet, ledger: undefined, context }
    const messages = mapper.map(input)
    const types = messages.map(byEventType)
    const expected: string[] = []

    expect(types).toEqual(expected)
  })
})
