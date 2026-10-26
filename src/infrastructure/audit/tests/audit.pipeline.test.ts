import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import type { Connection } from 'mongoose'
import { uuidv7 } from 'uuidv7'
import type { AuditType } from '@application/audits'
import type { ClockProtocol } from '@application/time'
import type { LoggerProtocol } from '@application/observability'
import { LedgerDirection } from '@domain/ledger/enums'
import { Ledger } from '@domain/ledger/ledger'
import { Money } from '@domain/money/money'
import { WagerTransactionKind } from '@domain/wager/enums'
import { WagerTransaction } from '@domain/wager/wager'
import { Wallet } from '@domain/wallet/wallet'
import { SimpleMetric } from '@infrastructure/observability'
import { AuditConsumer } from '../../messaging/consumers/audit.consumer'
import { ConsumerOutcome } from '../../messaging/enums'
import { AuditEventMapper } from '../../messaging/mappers'
import { WagerEventsMapper } from '../../messaging/mappers/wager-events.mapper'
import { AuditHarness } from './audit.harness'

const at = {
  open: new Date('2026-07-29T14:59:00.000Z'),
  processed: new Date('2026-07-29T15:00:00.000Z'),
  received: new Date('2026-07-29T15:00:01.000Z'),
}

const amount = {
  opening: '100.00',
  wager: '20.00',
  closing: '80.00',
}

const currency = 'BRL'

const receivedAt = at.received

const clock: ClockProtocol = {
  now: () => receivedAt,
}

class SilentLogger implements LoggerProtocol {
  warn(): void {}
}

class Suite {
  static connection: Connection
}

const wallet = (): Wallet =>
  Wallet.open({
    id: uuidv7(),
    playerId: uuidv7(),
    balance: Money.from({ amount: amount.opening, currency }),
    openedAt: at.open,
  })

const wager = (owner: Wallet): WagerTransaction => {
  const externalTransactionId = uuidv7()
  const input = {
    id: uuidv7(),
    providerId: 'provider-a',
    externalTransactionId,
    idempotencyKey: `provider-a:${externalTransactionId}`,
    payloadHash: uuidv7(),
    walletId: owner.id,
    playerId: owner.playerId,
    roundId: uuidv7(),
    gameId: 'fortune-tiger',
    kind: WagerTransactionKind.BET,
    money: Money.from({ amount: amount.wager, currency }),
    referenceExternalTransactionId: undefined,
    createdAt: at.open,
  }

  return WagerTransaction.create(input)
}

const envelopes = (): Array<string> => {
  const owner = wallet()
  const transaction = wager(owner)
  const money = transaction.money

  transaction.markProcessed(undefined, at.processed)
  owner.debit(money, at.processed)

  const ledger = Ledger.create({
    id: uuidv7(),
    walletId: owner.id,
    transactionId: transaction.id,
    direction: LedgerDirection.DEBIT,
    money,
    balanceBefore: Money.from({ amount: amount.opening, currency }),
    balanceAfter: Money.from({ amount: amount.closing, currency }),
    createdAt: at.processed,
  })
  const context = {
    correlationId: transaction.idempotencyKey,
    causationId: undefined,
    occurredAt: at.processed,
  }
  const rows = new WagerEventsMapper().map({ wager: transaction, wallet: owner, ledger, context })

  return rows.map((row) => JSON.stringify(row.payload))
}

const consumer = () =>
  new AuditConsumer(new AuditEventMapper(), AuditHarness.repository(Suite.connection), clock, new SilentLogger(), new SimpleMetric())

const message = (body: string, receiveCount = 1) => ({
  sqsMessageId: uuidv7(),
  receiptHandle: uuidv7(),
  body,
  receiveCount,
})

const read = async (): Promise<Array<AuditType.Event>> =>
  AuditHarness.repository(Suite.connection).timeline({ limit: 100 })

beforeAll(async () => {
  Suite.connection = await AuditHarness.open()
  await AuditHarness.sync(Suite.connection)
})

beforeEach(async () => {
  await AuditHarness.reset(Suite.connection)
})

afterAll(async () => {
  await AuditHarness.close(Suite.connection)
})

describe('Audit pipeline', () => {
  test('WHEN the outbox event reaches the audit consumer SHOULD persist the lifecycle', async () => {
    const [processed, changed] = envelopes()
    const subject = consumer()

    expect(await subject.consume({ message: message(processed ?? ''), at: receivedAt })).toBe(ConsumerOutcome.ACK)
    expect(await subject.consume({ message: message(changed ?? ''), at: receivedAt })).toBe(ConsumerOutcome.ACK)

    const items = await read()
    const types = items.map((item) => item.eventType)

    expect(types).toContain('WagerTransactionProcessed')
    expect(types).toContain('WalletBalanceChanged')
    expect(items.every((item) => item.recordedAt.getTime() === receivedAt.getTime())).toBe(true)
  })

  test('WHEN the same delivery arrives twice SHOULD acknowledge the duplicate and keep one row', async () => {
    const [processed] = envelopes()
    const subject = consumer()

    const first = await subject.consume({ message: message(processed ?? ''), at: receivedAt })
    const second = await subject.consume({ message: message(processed ?? ''), at: receivedAt })
    const items = await read()

    expect(first).toBe(ConsumerOutcome.ACK)
    expect(second).toBe(ConsumerOutcome.ACK)
    expect(items).toHaveLength(1)
  })

  test('WHEN an invalid event arrives SHOULD dead letter without persisting', async () => {
    const subject = consumer()
    const outcome = await subject.consume({ message: message('{'), at: receivedAt })

    expect(outcome).toBe(ConsumerOutcome.DEAD_LETTER)
    expect(await read()).toHaveLength(0)
  })

  test('WHEN the store is unreachable SHOULD refuse the event instead of acknowledging', async () => {
    const unreachable = AuditHarness.unreachable()
    const repository = AuditHarness.repository(unreachable)

    try {
      await expect(repository.record({
        eventId: uuidv7(),
        eventType: 'WagerTransactionProcessed',
        eventVersion: 1,
        occurredAt: at.processed,
        recordedAt: at.received,
        wagerId: uuidv7(),
        correlationId: 'provider-a:transaction-1',
        causationId: undefined,
        source: 'fortune-tiger',
        actor: undefined,
        metadata: {},
      })).rejects.toThrow()
    } finally {
      await AuditHarness.close(unreachable)
    }
  })

  test('WHEN the correlation is shared SHOULD read the whole lifecycle together', async () => {
    const [processed, changed] = envelopes()
    const subject = consumer()

    await subject.consume({ message: message(processed ?? ''), at: receivedAt })
    await subject.consume({ message: message(changed ?? ''), at: receivedAt })

    const correlationId = JSON.parse(processed ?? '{}').correlationId
    const repository = AuditHarness.repository(Suite.connection)
    const items = await repository.timeline({ correlationId, limit: 100 })

    expect(items).toHaveLength(2)
    expect(new Set(items.map((item) => item.correlationId))).toEqual(new Set([correlationId]))
  })
})
