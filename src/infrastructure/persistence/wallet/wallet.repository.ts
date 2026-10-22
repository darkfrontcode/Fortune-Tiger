import { LockMode } from '@mikro-orm/core'
import type { EntityManager } from '@mikro-orm/postgresql'
import { Wallet } from '@domain/wallet/wallet'
import { WalletEntity } from './wallet.entity'
import { WalletMapper } from './wallet.mapper'

export class WalletRepository {
  private readonly mapper = new WalletMapper()

  constructor(private readonly manager: EntityManager) {}

  async save(wallet: Wallet): Promise<void> {
    const mapped = this.mapper.toEntity(wallet)
    const existing = await this.manager.findOne(WalletEntity, { id: wallet.id })

    if (existing === null) {
      this.manager.persist(mapped)
    } else {
      this.mapper.write(existing, wallet)
    }

    await this.manager.flush()
  }

  async findById(id: string): Promise<Wallet | undefined> {
    const entity = await this.manager.findOne(WalletEntity, { id })

    if (entity === null) { return undefined }

    return this.mapper.toDomain(entity)
  }

  async findByIdForUpdate(id: string): Promise<Wallet | undefined> {
    const entity = await this.manager.findOne(
      WalletEntity,
      { id },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    )

    if (entity === null) { return undefined }

    return this.mapper.toDomain(entity)
  }

  async findByPlayerAndCurrency(playerId: string, currency: string): Promise<Wallet | undefined> {
    const entity = await this.manager.findOne(WalletEntity, { playerId, currency })

    if (entity === null) { return undefined }

    return this.mapper.toDomain(entity)
  }
}
