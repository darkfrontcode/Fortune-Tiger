import { LockMode, QueryOrder } from '@mikro-orm/core'
import type { EntityManager } from '@mikro-orm/postgresql'
import { IdempotencyType } from '../../../application/idempotencies/types'
import { WagerTransactionKind, WagerTransactionStatus } from '../../../domain/wager/enums'
import { WagerTransaction } from '../../../domain/wager/wager'
import { WalletEntity } from '../wallet/wallet.entity'
import { WagerTransactionEntity } from './wager-transaction.entity'
import { WagerTransactionMapper } from './wager-transaction.mapper'

const relation = 'wallet'

type Stored = IdempotencyType.Stored

export class WagerTransactionRepository {
  private readonly mapper = new WagerTransactionMapper()

  constructor(private readonly manager: EntityManager) {}

  async save(wager: WagerTransaction, observedBalance?: string): Promise<void> {
    const wallet = await this.manager.findOneOrFail(WalletEntity, { id: wager.walletId })
    const mapped = this.mapper.toEntity(wager, wallet, observedBalance)
    const existing = await this.manager.findOne(WagerTransactionEntity, { id: wager.id })

    if (existing === null) {
      this.manager.persist(mapped)
    } else {
      this.mapper.write(existing, wager, wallet, observedBalance)
    }

    await this.manager.flush()
  }

  async findStoredByIdempotencyKey(idempotencyKey: string): Promise<Stored | undefined> {
    const entity = await this.manager.findOne(
      WagerTransactionEntity,
      { idempotencyKey },
      { populate: [relation] },
    )

    if (entity === null) { return undefined }

    const wager = this.mapper.toDomain(entity)
    const observedBalance = entity.observedBalance ?? entity.wallet.balance

    return { wager, observedBalance }
  }

  async hasReversalForReference(referenceTransactionId: string): Promise<boolean> {
    const kinds = [WagerTransactionKind.REFUND, WagerTransactionKind.ROLLBACK]
    const entity = await this.manager.findOne(WagerTransactionEntity, {
      referenceTransactionId,
      kind: { $in: kinds },
      status: WagerTransactionStatus.PROCESSED,
    })

    return entity !== null
  }

  async findById(id: string): Promise<WagerTransaction | undefined> {
    const entity = await this.manager.findOne(
      WagerTransactionEntity,
      { id },
      { populate: [relation] },
    )

    if (entity === null) { return undefined }

    return this.mapper.toDomain(entity)
  }

  async findByIdForUpdate(id: string): Promise<WagerTransaction | undefined> {
    const entity = await this.manager.findOne(
      WagerTransactionEntity,
      { id },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    )

    if (entity === null) { return undefined }

    return this.mapper.toDomain(entity)
  }

  async dueForReference(at: Date, limit: number): Promise<Array<WagerTransaction>> {
    const entities = await this.manager.find(
      WagerTransactionEntity,
      {
        status: WagerTransactionStatus.PENDING_REFERENCE,
        $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: at } }],
      },
      {
        limit,
        orderBy: { nextAttemptAt: QueryOrder.ASC },
        populate: [relation],
      },
    )
    const toDomain = (entity: WagerTransactionEntity) => this.mapper.toDomain(entity)

    return entities.map(toDomain)
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<WagerTransaction | undefined> {
    const entity = await this.manager.findOne(
      WagerTransactionEntity,
      { idempotencyKey },
      { populate: [relation] },
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
      { populate: [relation] },
    )

    if (entity === null) { return undefined }

    return this.mapper.toDomain(entity)
  }
}
