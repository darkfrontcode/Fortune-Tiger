import type { EntityManager } from '@mikro-orm/postgresql'
import { WagerTransaction } from '../../../domain/wager/wager'
import { WalletEntity } from '../wallet/wallet.entity'
import { WagerTransactionEntity } from './wager-transaction.entity'
import { WagerTransactionMapper } from './wager-transaction.mapper'

export class WagerTransactionRepository {
  private readonly mapper = new WagerTransactionMapper()

  constructor(private readonly manager: EntityManager) {}

  async save(wager: WagerTransaction): Promise<void> {
    const wallet = await this.manager.findOneOrFail(WalletEntity, { id: wager.walletId })
    const mapped = this.mapper.toEntity(wager, wallet)
    const existing = await this.manager.findOne(WagerTransactionEntity, { id: wager.id })

    if (existing === null) {
      this.manager.persist(mapped)
    } else {
      this.mapper.write(existing, wager, wallet)
    }

    await this.manager.flush()
  }

  async findById(id: string): Promise<WagerTransaction | undefined> {
    const entity = await this.manager.findOne(
      WagerTransactionEntity,
      { id },
      { populate: ['wallet'] },
    )

    if (entity === null) { return undefined }

    return this.mapper.toDomain(entity)
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<WagerTransaction | undefined> {
    const entity = await this.manager.findOne(
      WagerTransactionEntity,
      { idempotencyKey },
      { populate: ['wallet'] },
    )

    if (entity === null) { return undefined }

    return this.mapper.toDomain(entity)
  }

  async findByProviderAndExternal(
    providerId: string,
    externalTransactionId: string,
  ): Promise<WagerTransaction | undefined> {
    const entity = await this.manager.findOne(
      WagerTransactionEntity,
      { providerId, externalTransactionId },
      { populate: ['wallet'] },
    )

    if (entity === null) { return undefined }

    return this.mapper.toDomain(entity)
  }
}
