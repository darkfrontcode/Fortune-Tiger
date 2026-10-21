import type { MikroORM } from '@mikro-orm/postgresql'
import { uuidv7 } from 'uuidv7'
import { LedgerDirection } from '../../../domain/ledger/enums'
import { Ledger } from '../../../domain/ledger/ledger'
import type { Wallet } from '../../../domain/wallet/wallet'
import { INSUFFICIENT_FUNDS_MESSAGE } from '../../../domain/wallet/data'
import { FailureCode } from '../../../domain/wager/enums'
import type { WagerTransaction } from '../../../domain/wager/wager'
import { WalletLedgerRepository } from '../ledger/wallet-ledger.repository'
import { WalletRepository } from '../wallet/wallet.repository'
import { WagerTransactionRepository } from './wager-transaction.repository'

export class WagerBetWriter {
  constructor(private readonly orm: MikroORM) {}

  async place(wager: WagerTransaction, at: Date): Promise<void> {
    const run = async () => {
      await this.orm.em.transactional(async (manager) => {
        const wallets = new WalletRepository(manager)
        const wagers = new WagerTransactionRepository(manager)
        const ledger = new WalletLedgerRepository(manager)
        const locked = await wallets.findByIdForUpdate(wager.walletId)

        if (locked === undefined) { return }

        const balanceBefore = locked.balance
        const rejected = WagerBetWriter.rejectOnDebit(locked, wager, at)

        if (rejected) {
          wager.reject(FailureCode.INSUFFICIENT_FUNDS)
          await wagers.save(wager)

          return
        }

        const balanceAfter = locked.balance
        const debitLedger = Ledger.create({
          id: uuidv7(),
          walletId: locked.id,
          transactionId: wager.id,
          direction: LedgerDirection.DEBIT,
          money: wager.money,
          balanceBefore,
          balanceAfter,
          createdAt: at,
        })

        wager.markProcessed(undefined, at)
        await wallets.save(locked)
        await ledger.save(debitLedger)
        await wagers.save(wager)
      })
    }

    await run()
  }

  private static rejectOnDebit(wallet: Wallet, wager: WagerTransaction, at: Date): boolean {
    const debit = () => {
      wallet.debit(wager.money, at)
    }

    try {
      debit()
    } catch (error) {
      const insufficient = error instanceof Error && error.message === INSUFFICIENT_FUNDS_MESSAGE

      if (insufficient) { return true }

      throw error
    }

    return false
  }
}
