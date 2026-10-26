import { MikroORM } from '@mikro-orm/postgresql'
import { Inject, Injectable } from '@nestjs/common'
import type { ReconciliationGatewayProtocol } from '@application/reconciliations'
import type { ReconciliationsType } from '@application/reconciliations/types'
import { WalletLedgerRepository } from '../repositories/wallet-ledger.repository'
import { WalletRepository } from '../repositories/wallet.repository'

type Snapshot = ReconciliationsType.Snapshot

@Injectable()
export class ReconciliationReader implements ReconciliationGatewayProtocol {
  constructor(@Inject(MikroORM) private readonly orm: MikroORM) {}

  async load(walletId: string): Promise<Snapshot | undefined> {
    const manager = this.orm.em.fork()
    const wallets = new WalletRepository(manager)
    const ledger = new WalletLedgerRepository(manager)
    const wallet = await wallets.findById(walletId)

    if (wallet === undefined) { return undefined }

    const ledgers = await ledger.listByWalletId(walletId)
    const stored = wallet.balance
    const snapshot = { stored, ledgers }

    return snapshot
  }
}
