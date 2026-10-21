import type { MikroORM } from '@mikro-orm/postgresql'
import { uuidv7 } from 'uuidv7'
import { IdempotencyService } from '../../../application/idempotencies/idempotency.service'
import { IdempotencyOutcome } from '../../../application/idempotencies/enums'
import type { WagerGatewayProtocol } from '../../../application/protocols'
import { WagerMediator } from '../../../application/transactions/wager/mediators/wager.mediator'
import type { TransactionsType } from '../../../application/transactions/wager'
import type { Ledger } from '../../../domain/ledger/ledger'
import type { Wallet } from '../../../domain/wallet/wallet'
import { FailureCode } from '../../../domain/wager/enums'
import type { WagerTransaction } from '../../../domain/wager/wager'
import { InboxMessage, WagerEventsMapper } from '../../messaging'
import { InboxMessageRepository } from '../inbox/inbox-message.repository'
import { WalletLedgerRepository } from '../ledger/wallet-ledger.repository'
import { OutboxMessageRepository } from '../outbox/outbox-message.repository'
import { WalletRepository } from '../wallet/wallet.repository'
import { WagerTransactionRepository } from './wager-transaction.repository'

type SubmitOutput = TransactionsType.SubmitOutput
type QueueInbox = TransactionsType.QueueInbox

export class WagerSubmitWriter implements WagerGatewayProtocol {
  private readonly idempotency = new IdempotencyService()

  private readonly events = new WagerEventsMapper()

  constructor(private readonly orm: MikroORM) {}

  async submit(wager: WagerTransaction, at: Date, inbox?: QueueInbox): Promise<SubmitOutput> {
    const run = async () => {
      return this.orm.em.transactional(async (manager) => {
        const wallets = new WalletRepository(manager)
        const wagers = new WagerTransactionRepository(manager)
        const ledger = new WalletLedgerRepository(manager)
        const inboxRepo = new InboxMessageRepository(manager)
        const outbox = new OutboxMessageRepository(manager)
        const queue = inbox !== undefined
        const deduped = queue
          ? await WagerSubmitWriter.inbox(inboxRepo, wagers, this.idempotency, wager, inbox)
          : undefined

        if (deduped !== undefined) { return deduped }

        const stored = await wagers.findStoredByIdempotencyKey(wager.idempotencyKey)

        if (stored !== undefined) {
          const replay = WagerSubmitWriter.replay(this.idempotency, wager, stored)

          if (replay !== undefined) {
            await WagerSubmitWriter.finishInbox(inboxRepo, inbox, at)

            return replay
          }
        }

        const locked = await wallets.findByIdForUpdate(wager.walletId)

        if (locked === undefined) {
          wager.reject(FailureCode.WALLET_NOT_FOUND)

          const observed = '0.00'
          return WagerSubmitWriter.fromWager(wager, observed, false)
        }

        const reference = await WagerSubmitWriter.reference(wagers, wager)
        const reversed = await WagerSubmitWriter.reversed(wagers, reference)
        const ledgerId = uuidv7()
        const mediation = {
          wallet: locked,
          reference,
          reversed,
          ledgerId,
          at,
        }
        const row = WagerMediator.mediate(wager, mediation)
        const observed = locked.balance.amount

        await WagerSubmitWriter.persist(wallets, wagers, ledger, locked, wager, row, observed)
        this.record(outbox, wager, locked, row, inbox, at)
        await WagerSubmitWriter.finishInbox(inboxRepo, inbox, at)

        return WagerSubmitWriter.fromWager(wager, observed, false)
      })
    }

    return run()
  }

  private static async inbox(
    inboxRepo: InboxMessageRepository,
    wagers: WagerTransactionRepository,
    idempotency: IdempotencyService,
    wager: WagerTransaction,
    envelope: QueueInbox,
  ): Promise<SubmitOutput | undefined> {
    const stored = await inboxRepo.find(envelope.consumerName, envelope.messageId)

    if (stored !== undefined && stored.isProcessed()) {
      const wagerStored = await wagers.findStoredByIdempotencyKey(wager.idempotencyKey)

      if (wagerStored === undefined) { return undefined }

      const replay = WagerSubmitWriter.replay(idempotency, wager, wagerStored)

      return replay
    }

    if (stored === undefined) {
      const receive = {
        messageId: envelope.messageId,
        consumerName: envelope.consumerName,
        payloadHash: wager.payloadHash,
        receivedAt: envelope.receivedAt,
      }
      const message = InboxMessage.receive(receive)

      await inboxRepo.save(message)
    }

    return undefined
  }

  private static async finishInbox(
    inboxRepo: InboxMessageRepository,
    envelope: QueueInbox | undefined,
    at: Date,
  ): Promise<void> {
    if (envelope === undefined) { return }

    const stored = await inboxRepo.find(envelope.consumerName, envelope.messageId)

    if (stored === undefined) { return }

    stored.markProcessed(at)

    await inboxRepo.save(stored)
  }

  private static replay(
    idempotency: IdempotencyService,
    wager: WagerTransaction,
    stored: { wager: WagerTransaction, observedBalance: string },
  ): SubmitOutput | undefined {
    const outcome = idempotency.outcome({
      key: wager.idempotencyKey,
      hash: wager.payloadHash,
      stored,
    })

    const conflict = outcome.outcome === IdempotencyOutcome.CONFLICT

    if (conflict) {
      const failureCode = outcome.failureCode

      return {
        transactionId: stored.wager.id,
        status: stored.wager.status,
        balance: stored.observedBalance,
        idempotentReplay: false,
        failureCode,
      }
    }

    const replayed = outcome.outcome === IdempotencyOutcome.REPLAY

    if (!replayed) { return undefined }

    return {
      transactionId: outcome.transactionId,
      status: outcome.status,
      balance: outcome.balance,
      idempotentReplay: outcome.idempotentReplay,
      failureCode: outcome.failureCode,
    }
  }

  private static fromWager(
    wager: WagerTransaction,
    balance: string,
    idempotentReplay: boolean,
  ): SubmitOutput {
    return {
      transactionId: wager.id,
      status: wager.status,
      balance,
      idempotentReplay,
      failureCode: wager.failureCode,
    }
  }

  private static async reference(
    wagers: WagerTransactionRepository,
    wager: WagerTransaction,
  ): Promise<WagerTransaction | undefined> {
    const external = wager.referenceExternalTransactionId

    if (external === undefined) { return undefined }

    return wagers.findByProviderAndExternal(wager.providerId, external)
  }

  private static async reversed(
    wagers: WagerTransactionRepository,
    reference: WagerTransaction | undefined,
  ): Promise<boolean> {
    if (reference === undefined) { return false }

    return wagers.hasReversalForReference(reference.id)
  }

  private static async persist(
    wallets: WalletRepository,
    wagers: WagerTransactionRepository,
    ledger: WalletLedgerRepository,
    wallet: Wallet,
    wager: WagerTransaction,
    row: Ledger | undefined,
    observed: string,
  ): Promise<void> {
    await wallets.save(wallet)
    await wagers.save(wager, observed)

    if (row === undefined) { return }

    await ledger.save(row)
  }

  private record(
    outbox: OutboxMessageRepository,
    wager: WagerTransaction,
    wallet: Wallet,
    ledger: Ledger | undefined,
    inbox: QueueInbox | undefined,
    at: Date,
  ): void {
    const correlationId = wager.idempotencyKey
    const causationId = inbox === undefined ? undefined : inbox.messageId
    const context = { correlationId, causationId, occurredAt: at }
    const input = { wager, wallet, ledger, context }
    const messages = this.events.map(input)

    outbox.saveMany(messages)
  }
}
