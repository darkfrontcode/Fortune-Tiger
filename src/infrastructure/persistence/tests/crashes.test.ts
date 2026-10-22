import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import {
  CreateQueueCommand,
  DeleteQueueCommand,
  SendMessageCommand,
} from '@aws-sdk/client-sqs'
import type { MikroORM } from '@mikro-orm/postgresql'
import { join } from 'node:path'
import { uuidv7 } from 'uuidv7'
import { IdempotencyService } from '../../../application/idempotencies'
import type { ClockProtocol, LoggerProtocol } from '../../../application/protocols'
import { ReferenceMediator, WagerMediator } from '../../../application/transactions/wager/mediators'
import { WagerService } from '../../../application/transactions'
import { LedgerDirection } from '../../../domain/ledger'
import type { Ledger } from '../../../domain/ledger'
import { Money } from '../../../domain/money'
import { Wallet } from '../../../domain/wallet'
import { WagerTransaction, WagerTransactionKind, WagerTransactionStatus } from '../../../domain/wager'
import { WagerEventsMapper, WagerRequestMapper } from '../../messaging/mappers'
import { SqsConsumer, SqsQueue, WagerConsumer } from '../../messaging/consumers'
import type { ConsumerType } from '../../messaging/consumers'
import { Environment } from '../../environment'
import { createSqsClient } from '../../messaging/factories'
import { InboxMessageRepository } from '../inbox'
import { WalletLedgerRepository } from '../ledger'
import { ReferenceRetryWriter, WagerSubmitWriter, WagerTransactionRepository } from '../wager'
import { WalletRepository } from '../wallet'
import { PersistenceHarness } from './persistence.harness'

type WagerInput = {
  wallet: Wallet
  externalTransactionId: string
  kind: WagerTransactionKind
  referenceExternalTransactionId: string | undefined
  roundId: string
  createdAt: Date
}

type RequestInput = {
  wallet: Wallet
  externalTransactionId: string
  idempotencyKey: string
  messageId: string
  roundId: string
}

type CrashOutput = {
  reachedAck: boolean
  exitCode: number
}

const currency = {
  brl: 'BRL',
}

const amount = {
  hundred: '100.00',
  ninety: '90.00',
  eighty: '80.00',
  ten: '10.00',
  twenty: '20.00',
}

const instant = {
  open: new Date('2026-01-01T00:00:00.000Z'),
  processed: new Date('2026-01-01T00:00:01.000Z'),
  retry: new Date('2026-01-01T00:00:02.000Z'),
  received: new Date('2026-01-01T00:00:03.000Z'),
}

const provider = {
  id: 'crash-test-provider',
}

const game = 'fortune-tiger'
const separator = ':'
const requestType = 'WagerTransactionRequested'
const consumerName = 'wager'
const acknowledgement = 'ACK_PENDING'
const successfulExitCode = 0
const terminationSignal = 'SIGTERM'
const timeout = 120_000
const visibilityTimeout = 1
const visibilityDelay = 1_100
const waitTimeSeconds = 1
const one = 1
const noMessages = 0
const queueNamePrefix = 'crash-recovery-'
const fifoSuffix = '.fifo'
const queueAttributes = {
  fifo: 'true',
  contentBasedDeduplication: 'false',
}
const visibilityAttribute = String(visibilityTimeout)
const command = {
  run: 'run',
}
const state: { orm: MikroORM | undefined } = { orm: undefined }
const worker = join(
  process.cwd(),
  'src',
  'infrastructure',
  'persistence',
  'tests',
  'crash.worker.ts',
)

const environment = new Environment()
const sqs = createSqsClient(environment)

const persistence = (): MikroORM => {
  const orm = state.orm

  if (orm === undefined) { throw new Error('The persistence test suite is not open') }

  return orm
}

const openWallet = (): Wallet => {
  const id = uuidv7()
  const playerId = uuidv7()
  const balance = Money.from({ amount: amount.hundred, currency: currency.brl })
  const input = { id, playerId, balance, openedAt: instant.open }

  return Wallet.open(input)
}

const createWager = (input: WagerInput): WagerTransaction => {
  const id = uuidv7()
  const idempotencyKey = `${provider.id}${separator}${input.externalTransactionId}`
  const payloadHash = `${input.kind}${separator}${input.externalTransactionId}`
  const money = Money.from({ amount: amount.ten, currency: currency.brl })
  const wagerInput = {
    id,
    providerId: provider.id,
    externalTransactionId: input.externalTransactionId,
    idempotencyKey,
    payloadHash,
    walletId: input.wallet.id,
    playerId: input.wallet.playerId,
    roundId: input.roundId,
    gameId: game,
    kind: input.kind,
    money,
    referenceExternalTransactionId: input.referenceExternalTransactionId,
    createdAt: input.createdAt,
  }

  return WagerTransaction.create(wagerInput)
}

const requestBody = (input: RequestInput): string => {
  const occurredAt = instant.processed.toISOString()
  const data = {
    providerId: provider.id,
    externalTransactionId: input.externalTransactionId,
    playerId: input.wallet.playerId,
    walletId: input.wallet.id,
    roundId: input.roundId,
    gameId: game,
    idempotencyKey: input.idempotencyKey,
    kind: WagerTransactionKind.BET,
    money: { amount: amount.twenty, currency: currency.brl },
  }
  const request = {
    messageId: input.messageId,
    type: requestType,
    occurredAt,
    data,
  }

  return JSON.stringify(request)
}

const writer = (
  orm: MikroORM,
  idempotency: IdempotencyService,
): WagerSubmitWriter => new WagerSubmitWriter(
  orm,
  idempotency,
  new WagerEventsMapper(),
  new WagerMediator(),
)

const consumer = (orm: MikroORM): WagerConsumer => {
  const idempotency = new IdempotencyService()
  const gateway = writer(orm, idempotency)
  const service = new WagerService(gateway, idempotency)
  const mapper = new WagerRequestMapper()

  return new WagerConsumer(service, mapper, consumerName)
}

const reopen = async (): Promise<void> => {
  await PersistenceHarness.close(persistence())
  state.orm = await PersistenceHarness.open()
}

const killBeforeAck = async (
  message: ConsumerType.QueueMessage,
  receivedAt: Date,
): Promise<CrashOutput> => {
  const args = [
    process.execPath,
    command.run,
    worker,
    message.body,
    receivedAt.toISOString(),
    message.sqsMessageId,
    message.receiptHandle,
    String(message.receiveCount),
  ]
  const child = Bun.spawn(args, { cwd: process.cwd(), stdout: 'pipe', stderr: 'inherit' })
  const read = async (): Promise<boolean> => {
    const stdout = child.stdout

    if (stdout === null) { throw new Error('The crash worker stdout is unavailable') }

    const reader = stdout.getReader()
    const chunk = await reader.read()
    const output = chunk.value === undefined ? String() : new TextDecoder().decode(chunk.value)

    return output.includes(acknowledgement)
  }
  const reachedAck = await read().finally(async () => {
    const running = child.exitCode === null

    if (running) { child.kill(terminationSignal) }

    await child.exited
  })
  const exitCode = await child.exited

  return { reachedAck, exitCode }
}

beforeAll(async () => {
  state.orm = await PersistenceHarness.open()
})

beforeEach(async () => {
  await PersistenceHarness.reset(persistence())
})

afterAll(async () => {
  const orm = state.orm

  if (orm !== undefined) { await PersistenceHarness.close(orm) }
})

describe('Crash recovery', () => {
  test('WHEN the process dies after commit and before ack SHOULD replay from SQS after restart', async () => {
    const orm = persistence()
    const wallet = openWallet()
    const externalTransactionId = uuidv7()
    const idempotencyKey = `${provider.id}${separator}${externalTransactionId}`
    const messageId = uuidv7()
    const roundId = uuidv7()
    const input = {
      wallet,
      externalTransactionId,
      idempotencyKey,
      messageId,
      roundId,
    }
    const body = requestBody(input)
    const queueName = `${queueNamePrefix}${uuidv7()}${fifoSuffix}`
    const created = await sqs.send(new CreateQueueCommand({
      QueueName: queueName,
      Attributes: {
        FifoQueue: queueAttributes.fifo,
        ContentBasedDeduplication: queueAttributes.contentBasedDeduplication,
        VisibilityTimeout: visibilityAttribute,
      },
    }))
    const queueUrl = created.QueueUrl

    if (queueUrl === undefined) { throw new Error('The crash test queue was not created') }

    const config: ConsumerType.Config = {
      queueUrl,
      deadLetterQueueUrl: environment.deadLetterQueueUrl,
      maxMessages: one,
      waitTimeSeconds,
      visibilityTimeout,
    }
    const queue = new SqsQueue(sqs, config)
    try {
      await new WalletRepository(orm.em).save(wallet)

      const sent = await sqs.send(new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: body,
        MessageGroupId: messageId,
        MessageDeduplicationId: messageId,
      }))
      const sentMessageId = sent.MessageId

      if (sentMessageId === undefined) { throw new Error('SQS did not return a message id') }

      const receivedMessages = await queue.receive()
      const [message] = receivedMessages

      if (message === undefined) { throw new Error('The crash test message was not received') }

      const crash = await killBeforeAck(message, instant.received)

      expect(sentMessageId).toBe(message.sqsMessageId)
      expect(crash.reachedAck).toBe(true)
      expect(crash.exitCode).not.toBe(successfulExitCode)

      await reopen()
      await Bun.sleep(visibilityDelay)

      const redeliveredMessages = await queue.receive()
      const [redelivered] = redeliveredMessages

      if (redelivered === undefined) { throw new Error('SQS did not redeliver the unacked message') }

      const clock: ClockProtocol = { now: () => instant.received }
      const logger: LoggerProtocol = { warn: () => undefined }
      const restarted = new SqsConsumer(queue, consumer(persistence()), clock, logger)

      await restarted.consume(redelivered)

      const manager = persistence().em.fork()
      const storedWallet = await new WalletRepository(manager).findById(wallet.id)
      const ledgers = await new WalletLedgerRepository(manager).listByWalletId(wallet.id)
      const inbox = await new InboxMessageRepository(manager).find(consumerName, messageId)
      const wager = await new WagerTransactionRepository(manager).findByIdempotencyKey(idempotencyKey)
      const toBalance = (ledger: Ledger) => ledger.balanceAfter.amount
      const remaining = await queue.receive()

      expect(redelivered.receiveCount).toBeGreaterThan(message.receiveCount)
      expect(storedWallet?.balance.amount).toBe(amount.eighty)
      expect(ledgers).toHaveLength(one)
      expect(ledgers.map(toBalance)).toEqual([amount.eighty])
      expect(inbox?.isProcessed()).toBe(true)
      expect(wager?.status).toBe(WagerTransactionStatus.PROCESSED)
      expect(remaining).toHaveLength(noMessages)
    } finally {
      await sqs.send(new DeleteQueueCommand({ QueueUrl: queueUrl }))
    }
  }, timeout)

  test('WHEN a refund arrives before its bet SHOULD reconcile after restart', async () => {
    const orm = persistence()
    const wallet = openWallet()
    const roundId = uuidv7()
    const betExternalTransactionId = uuidv7()
    const refund = createWager({
      wallet,
      externalTransactionId: uuidv7(),
      kind: WagerTransactionKind.REFUND,
      referenceExternalTransactionId: betExternalTransactionId,
      roundId,
      createdAt: instant.open,
    })
    const repository = new WalletRepository(orm.em)
    const submitter = writer(orm, new IdempotencyService())

    await repository.save(wallet)

    const waiting = await submitter.submit(refund, instant.open)
    const bet = createWager({
      wallet,
      externalTransactionId: betExternalTransactionId,
      kind: WagerTransactionKind.BET,
      referenceExternalTransactionId: undefined,
      roundId,
      createdAt: instant.processed,
    })
    const processed = await submitter.submit(bet, instant.processed)
    const reference = new ReferenceRetryWriter(
      orm,
      new ReferenceMediator(new WagerMediator()),
      new WagerEventsMapper(),
    )
    const retried = await reference.retry(refund.id, instant.retry)

    await reopen()

    const manager = persistence().em.fork()
    const storedWallet = await new WalletRepository(manager).findById(wallet.id)
    const ledgers = await new WalletLedgerRepository(manager).listByWalletId(wallet.id)
    const toDirection = (ledger: Ledger) => ledger.direction
    const toBalance = (ledger: Ledger) => ledger.balanceAfter.amount
    const finalLedger = ledgers[ledgers.length - one]

    expect(waiting.status).toBe(WagerTransactionStatus.PENDING_REFERENCE)
    expect(processed.status).toBe(WagerTransactionStatus.PROCESSED)
    expect(retried?.status).toBe(WagerTransactionStatus.PROCESSED)
    expect(ledgers.map(toDirection)).toEqual([LedgerDirection.DEBIT, LedgerDirection.CREDIT])
    expect(ledgers.map(toBalance)).toEqual([amount.ninety, amount.hundred])
    expect(finalLedger?.balanceAfter.amount).toBe(storedWallet?.balance.amount)
  }, timeout)
})
