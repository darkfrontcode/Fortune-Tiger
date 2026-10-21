import type { EntityManager } from '@mikro-orm/postgresql'
import { Ledger } from '../../../domain/ledger/ledger'
import { WalletEntity } from '../wallet/wallet.entity'
import { WalletLedgerEntity } from './wallet-ledger.entity'
import { WalletLedgerMapper } from './wallet-ledger.mapper'

export class WalletLedgerRepository {
  private readonly mapper = new WalletLedgerMapper()

  constructor(private readonly manager: EntityManager) {}

  async save(ledger: Ledger): Promise<void> {
    const wallet = await this.manager.findOneOrFail(WalletEntity, { id: ledger.walletId })
    const mapped = this.mapper.toEntity(ledger, wallet)
    const existing = await this.manager.findOne(WalletLedgerEntity, { id: ledger.id })

    if (existing === null) {
      this.manager.persist(mapped)
    } else {
      existing.wallet = wallet
      existing.transactionId = mapped.transactionId
      existing.direction = mapped.direction
      existing.amount = mapped.amount
      existing.currency = mapped.currency
      existing.balanceBefore = mapped.balanceBefore
      existing.balanceAfter = mapped.balanceAfter
      existing.createdAt = mapped.createdAt
    }

    await this.manager.flush()
  }

  async findByTransactionId(transactionId: string): Promise<Ledger | undefined> {
    const entity = await this.manager.findOne(
      WalletLedgerEntity,
      { transactionId },
      { populate: ['wallet'] },
    )

    if (entity === null) { return undefined }

    return this.mapper.toDomain(entity)
  }

  async listByWalletId(walletId: string): Promise<Ledger[]> {
    const entities = await this.manager.find(
      WalletLedgerEntity,
      { wallet: { id: walletId } },
      { populate: ['wallet'], orderBy: { createdAt: 'ASC' } },
    )

    const mapDomain = (entity: WalletLedgerEntity) => this.mapper.toDomain(entity)

    return entities.map(mapDomain)
  }
}
