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
import { WalletLedgerRepository } from '../ledger/wallet-ledger.repository'
import { WalletRepository } from '../wallet/wallet.repository'
import { WagerTransactionRepository } from './wager-transaction.repository'

type SubmitOutput = TransactionsType.SubmitOutput

export class WagerSubmitWriter implements WagerGatewayProtocol {
  private readonly idempotency = new IdempotencyService()

  constructor(private readonly orm: MikroORM) {}

  async submit(wager: WagerTransaction, at: Date): Promise<SubmitOutput> {
    const run = async () => {
      return this.orm.em.transactional(async (manager) => {
        const wallets = new WalletRepository(manager)
        const wagers = new WagerTransactionRepository(manager)
        const ledger = new WalletLedgerRepository(manager)
        const stored = await wagers.findStoredByIdempotencyKey(wager.idempotencyKey)

        if (stored !== undefined) {
          const replay = WagerSubmitWriter.replay(this.idempotency, wager, stored)

          if (replay !== undefined) { return replay }
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

        return WagerSubmitWriter.fromWager(wager, observed, false)
      })
    }

    return run()
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
}
