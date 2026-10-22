import { MikroORM } from '@mikro-orm/postgresql'
import { Inject, Injectable } from '@nestjs/common'
import { uuidv7 } from 'uuidv7'
import type { ReferenceGatewayProtocol } from '@application/protocols'
import type { ReferenceType } from '@application/references/types'
import { ReferenceMediator } from '@application/transactions/wager/mediators'
import type { Ledger } from '@domain/ledger'
import type { Wallet } from '@domain/wallet'
import { WagerTransactionStatus } from '@domain/wager/enums'
import type { WagerTransaction } from '@domain/wager/wager'
import { WagerEventsMapper } from '../../messaging/mappers'
import { WalletLedgerRepository } from '../ledger/wallet-ledger.repository'
import { OutboxMessageRepository } from '../outbox/outbox-message.repository'
import { WalletRepository } from '../wallet/wallet.repository'
import { WagerTransactionRepository } from './wager-transaction.repository'

type RetryOutput = ReferenceType.RetryOutput

const pending = WagerTransactionStatus.PENDING_REFERENCE

@Injectable()
export class ReferenceRetryWriter implements ReferenceGatewayProtocol {
  constructor(
    @Inject(MikroORM) private readonly orm: MikroORM,
    private readonly mediator: ReferenceMediator,
    private readonly events: WagerEventsMapper,
  ) {}

  async retry(transactionId: string, at: Date): Promise<RetryOutput | undefined> {
    return this.orm.em.transactional(async (manager) => {
      const wagers = new WagerTransactionRepository(manager)
      const wallets = new WalletRepository(manager)
      const ledger = new WalletLedgerRepository(manager)
      const outbox = new OutboxMessageRepository(manager)
      const wager = await wagers.findByIdForUpdate(transactionId)

      if (wager === undefined) { return undefined }
      if (wager.status !== pending) { return undefined }

      const wallet = await wallets.findByIdForUpdate(wager.walletId)

      if (wallet === undefined) { return undefined }

      const reference = await this.reference(wagers, wager)
      const reversed = await this.reversed(wagers, reference)
      const ledgerId = uuidv7()
      const mediation = { wallet, reference, reversed, ledgerId, at }
      const observed = wallet.balance.amount
      const row = this.mediator.retry(wager, mediation)

      if (row !== undefined) { await wallets.save(wallet) }

      await wagers.save(wager, observed)

      if (row !== undefined) { await ledger.save(row) }

      if (wager.status !== pending) { this.record(outbox, wager, wallet, row, at) }

      return { transactionId: wager.id, status: wager.status }
    })
  }

  private async reference(
    wagers: WagerTransactionRepository,
    wager: WagerTransaction,
  ): Promise<WagerTransaction | undefined> {
    const external = wager.referenceExternalTransactionId

    if (external === undefined) { return undefined }

    return wagers.findByProviderAndExternal(wager.providerId, external)
  }

  private async reversed(
    wagers: WagerTransactionRepository,
    reference: WagerTransaction | undefined,
  ): Promise<boolean> {
    if (reference === undefined) { return false }

    return wagers.hasReversalForReference(reference.id)
  }

  private record(
    outbox: OutboxMessageRepository,
    wager: WagerTransaction,
    wallet: Wallet,
    ledger: Ledger | undefined,
    at: Date,
  ): void {
    const correlationId = wager.idempotencyKey
    const causationId = undefined
    const occurredAt = at
    const context = { correlationId, causationId, occurredAt }
    const input = { wager, wallet, ledger, context }
    const messages = this.events.map(input)

    outbox.saveMany(messages)
  }
}
