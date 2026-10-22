import { describe, expect, test } from 'bun:test'
import { IdempotencyService } from '@application/idempotencies/idempotency.service'
import type { WagerGatewayProtocol } from '@application/wagers'
import { SubmitWagerUseCase } from '@application/wagers/use-cases'
import type { WagersType } from '@application/wagers'
import { WagerTransactionKind, WagerTransactionStatus } from '@domain/wager/enums'
import type { WagerTransaction } from '@domain/wager/wager'
import { WagerRequestMapper } from '../../mappers'
import { ConsumerOutcome } from '../enums'
import type { ConsumerType } from '../types'
import { WagerConsumer } from '../wager.consumer'

type SubmitOutput = WagersType.SubmitOutput
type QueueInbox = WagersType.QueueInbox

const identity = {
  messageId: 'msg-123',
  providerId: 'provider-a',
  externalTransactionId: 'transaction-1',
  playerId: 'player-1',
  walletId: 'wallet-1',
  roundId: 'round-1',
  gameId: 'game-1',
  idempotencyKey: 'provider-a:transaction-1',
  consumerName: 'wager-transactions',
}

const instant = {
  occurredAt: '2026-07-29T15:00:00.000Z',
  receivedAt: new Date('2026-07-29T15:00:01.000Z'),
}

type Changes = {
  kind?: unknown
  money?: unknown
  referenceExternalTransactionId?: string
}

const request = (kind: WagerTransactionKind, changes: Changes = {}) => ({
  messageId: identity.messageId,
  type: 'WagerTransactionRequested',
  occurredAt: instant.occurredAt,
  data: {
    providerId: identity.providerId,
    externalTransactionId: identity.externalTransactionId,
    playerId: identity.playerId,
    walletId: identity.walletId,
    roundId: identity.roundId,
    gameId: identity.gameId,
    idempotencyKey: identity.idempotencyKey,
    kind,
    money: {
      amount: '10.00',
      currency: 'BRL',
    },
    ...changes,
  },
})

type Call = {
  wager: WagerTransaction
  at: Date
  inbox: QueueInbox | undefined
}

class RecordingGateway implements WagerGatewayProtocol {
  readonly calls = new Array<Call>()

  constructor(
    private readonly status: WagerTransactionStatus = WagerTransactionStatus.PROCESSED,
    private readonly failure = false,
  ) {}

  async submit(wager: WagerTransaction, at: Date, inbox?: QueueInbox): Promise<SubmitOutput> {
    this.calls.push({ wager, at, inbox })

    if (this.failure) { throw new Error('Database unavailable') }

    return {
      transactionId: wager.id,
      status: this.status,
      balance: '90.00',
      idempotentReplay: false,
      failureCode: undefined,
    }
  }
}

const message = (value: unknown, receiveCount = 1): ConsumerType.QueueMessage => ({
  sqsMessageId: 'sqs-1',
  receiptHandle: 'receipt-1',
  body: typeof value === 'string' ? value : JSON.stringify(value),
  receiveCount,
})

const consumer = (gateway: WagerGatewayProtocol) =>
  new WagerConsumer(
    new SubmitWagerUseCase(gateway, new IdempotencyService()),
    new WagerRequestMapper(),
    identity.consumerName,
  )

describe('WagerConsumer', () => {
  test('WHEN the request is applied SHOULD ack after the use case', async () => {
    const gateway = new RecordingGateway()
    const subject = consumer(gateway)
    const outcome = await subject.consume({ message: message(request(WagerTransactionKind.BET)), at: instant.receivedAt })

    expect(outcome).toBe(ConsumerOutcome.ACK)
    expect(gateway.calls).toHaveLength(1)

    const call = gateway.calls[0]

    if (call === undefined || call.inbox === undefined) { throw new Error('Expected the inbox') }

    expect(call.inbox.messageId).toBe(identity.messageId)
    expect(call.inbox.consumerName).toBe(identity.consumerName)
    expect(call.inbox.receivedAt).toEqual(instant.receivedAt)
    expect(call.at).toEqual(new Date(instant.occurredAt))
  })

  test('WHEN the use case rejects the wager SHOULD ack the business failure', async () => {
    const gateway = new RecordingGateway(WagerTransactionStatus.REJECTED)
    const subject = consumer(gateway)
    const outcome = await subject.consume({ message: message(request(WagerTransactionKind.BET)), at: instant.receivedAt })

    expect(outcome).toBe(ConsumerOutcome.ACK)
  })

  test('WHEN the use case fails under the limit SHOULD retry', async () => {
    const gateway = new RecordingGateway(WagerTransactionStatus.PROCESSED, true)
    const subject = consumer(gateway)
    const outcome = await subject.consume({ message: message(request(WagerTransactionKind.BET)), at: instant.receivedAt })

    expect(outcome).toBe(ConsumerOutcome.RETRY)
  })

  test('WHEN the use case fails on the fifth receive SHOULD dead letter', async () => {
    const gateway = new RecordingGateway(WagerTransactionStatus.PROCESSED, true)
    const subject = consumer(gateway)
    const outcome = await subject.consume({
      message: message(request(WagerTransactionKind.BET), 5),
      at: instant.receivedAt,
    })

    expect(outcome).toBe(ConsumerOutcome.DEAD_LETTER)
  })

  test('WHEN the body is malformed SHOULD dead letter without calling the use case', async () => {
    const gateway = new RecordingGateway()
    const subject = consumer(gateway)
    const outcome = await subject.consume({ message: message('{'), at: instant.receivedAt })

    expect(outcome).toBe(ConsumerOutcome.DEAD_LETTER)
    expect(gateway.calls).toHaveLength(0)
  })

  test('WHEN the message is an integration event SHOULD ack without calling the use case', async () => {
    const gateway = new RecordingGateway()
    const subject = consumer(gateway)
    const event = { eventType: 'WagerTransactionProcessed', messageId: identity.messageId }
    const outcome = await subject.consume({ message: message(event), at: instant.receivedAt })

    expect(outcome).toBe(ConsumerOutcome.ACK)
    expect(gateway.calls).toHaveLength(0)
  })

  test('WHEN the kind is unknown SHOULD dead letter without calling the use case', async () => {
    const gateway = new RecordingGateway()
    const subject = consumer(gateway)
    const body = request(WagerTransactionKind.BET, { kind: 'UNKNOWN' })
    const outcome = await subject.consume({ message: message(body), at: instant.receivedAt })

    expect(outcome).toBe(ConsumerOutcome.DEAD_LETTER)
    expect(gateway.calls).toHaveLength(0)
  })
})
