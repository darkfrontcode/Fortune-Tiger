import { Money } from '../../../domain/money/money'
import { WagerTransaction } from '../../../domain/wager/wager'
import { WalletEntity } from '../wallet/wallet.entity'
import { WagerTransactionEntity } from './wager-transaction.entity'

export class WagerTransactionMapper {
  toDomain(entity: WagerTransactionEntity): WagerTransaction {
    const money = Money.from({ amount: entity.amount, currency: entity.currency })

    const schema = {
      id: entity.id,
      providerId: entity.providerId,
      externalTransactionId: entity.externalTransactionId,
      idempotencyKey: entity.idempotencyKey,
      payloadHash: entity.payloadHash,
      walletId: entity.wallet.id,
      playerId: entity.playerId,
      roundId: entity.roundId,
      gameId: entity.gameId,
      kind: entity.kind,
      money,
      referenceExternalTransactionId: entity.referenceExternalTransactionId,
      createdAt: entity.createdAt,
      status: entity.status,
      referenceTransactionId: entity.referenceTransactionId,
      failureCode: entity.failureCode,
      processedAt: entity.processedAt,
    }

    return WagerTransaction.rehydrate(schema)
  }

  toEntity(wager: WagerTransaction, wallet: WalletEntity): WagerTransactionEntity {
    const entity = new WagerTransactionEntity()

    entity.id = wager.id
    entity.providerId = wager.providerId
    entity.externalTransactionId = wager.externalTransactionId
    entity.idempotencyKey = wager.idempotencyKey
    entity.payloadHash = wager.payloadHash
    entity.wallet = wallet
    entity.playerId = wager.playerId
    entity.roundId = wager.roundId
    entity.gameId = wager.gameId
    entity.kind = wager.kind
    entity.amount = wager.money.amount
    entity.currency = wager.money.currency
    entity.referenceExternalTransactionId = wager.referenceExternalTransactionId
    entity.referenceTransactionId = wager.referenceTransactionId
    entity.status = wager.status
    entity.failureCode = wager.failureCode
    entity.createdAt = wager.createdAt
    entity.processedAt = wager.processedAt

    return entity
  }

  write(entity: WagerTransactionEntity, wager: WagerTransaction, wallet: WalletEntity): void {
    entity.providerId = wager.providerId
    entity.externalTransactionId = wager.externalTransactionId
    entity.idempotencyKey = wager.idempotencyKey
    entity.payloadHash = wager.payloadHash
    entity.wallet = wallet
    entity.playerId = wager.playerId
    entity.roundId = wager.roundId
    entity.gameId = wager.gameId
    entity.kind = wager.kind
    entity.amount = wager.money.amount
    entity.currency = wager.money.currency
    entity.referenceExternalTransactionId = wager.referenceExternalTransactionId
    entity.referenceTransactionId = wager.referenceTransactionId
    entity.status = wager.status
    entity.failureCode = wager.failureCode
    entity.createdAt = wager.createdAt
    entity.processedAt = wager.processedAt
  }
}
