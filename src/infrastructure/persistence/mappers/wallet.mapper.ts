import { Money } from '@domain/money/money'
import { Wallet } from '@domain/wallet/wallet'
import { WalletEntity } from '../entities/wallet.entity'

export class WalletMapper {
  toDomain(entity: WalletEntity): Wallet {
    const balance = Money.from({ amount: entity.balance, currency: entity.currency })
    
    const schema = {
      id: entity.id,
      playerId: entity.playerId,
      balance,
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }

    return Wallet.rehydrate(schema)
  }

  toEntity(wallet: Wallet): WalletEntity {
    const entity = new WalletEntity()

    entity.id = wallet.id
    entity.playerId = wallet.playerId
    entity.balance = wallet.balance.amount
    entity.currency = wallet.balance.currency
    entity.version = wallet.version
    entity.createdAt = wallet.createdAt
    entity.updatedAt = wallet.updatedAt

    return entity
  }

  write(entity: WalletEntity, wallet: Wallet): void {
    entity.playerId = wallet.playerId
    entity.balance = wallet.balance.amount
    entity.currency = wallet.balance.currency
    entity.version = wallet.version
    entity.createdAt = wallet.createdAt
    entity.updatedAt = wallet.updatedAt
  }
}
